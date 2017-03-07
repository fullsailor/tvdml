import h from 'virtual-dom/h';
import createElement from 'virtual-dom/create-element';

import CustomNode from './custom-node';
import {Component} from './component';
import {broadcast} from '../event-bus';
import {noop} from '../utils';

const DEFAULT_HANDLER = 'default';

const handlers = {
	play: {
		[DEFAULT_HANDLER]: createDefaultHandler('onPlay'),
	},

	select: {
		[DEFAULT_HANDLER]: createDefaultHandler('onSelect'),

		menuItem({target: menuItem}) {
			let menuBar = menuItem.parentNode;
			let feature = menuBar.getFeature('MenuBarDocument');

			broadcast('menu-item-select', {
				menuItem,
				menuBar: feature,
			});
		},
	},

	change: {
		[DEFAULT_HANDLER]: createDefaultHandler('onChange'),
	},

	highlight: {
		[DEFAULT_HANDLER]: createDefaultHandler('onHighlight'),
	},

	holdselect: {
		[DEFAULT_HANDLER]: createDefaultHandler('onHoldselect'),
	},
};

const eventsList = [
	'play',
	'select',
	'change',
	'highlight',
	'holdselect',
];

export function vdomToDocument(vdom, payload) {
	const {menuBar, menuItem} = payload && payload.navigation || {};

	let vnode;

	if (vdom instanceof CustomNode) {
		vnode = vdom.toNode(payload);
	} else {
		vnode = vdom;
	}

	if (menuItem) {
		const menuItemDocument = menuBar.getDocument(menuItem);

		if (menuItemDocument && menuItemDocument.updateComponent) {
			menuItemDocument.updateComponent(payload);
			return menuItemDocument;
		}
	}

	const document = createEmptyDocument();

	const childNode = createElement(vnode, {document});
	const menuBars = childNode.getElementsByTagName('menuBar');

	if (menuBars.length) {
		document.menuBarDocument = menuBars.item(0).getFeature('MenuBarDocument');
	} else if (vnode instanceof Component) {
		document.updateComponent = vnode.updateProps.bind(vnode);
		document.destroyComponent = vnode.destroy.bind(vnode, childNode);
	}

	document.appendChild(childNode);
	attachEventListeners(document);
	return document;
}

export function attachEventListeners(document) {
	eventsList.forEach(eventName => {
		document.addEventListener(eventName, createEventHandler(handlers[eventName]))
	});

	return document;
}

export function createEmptyDocument() {
	const document = DOMImplementationRegistry
		.getDOMImplementation()
		.createDocument();

	document.extra = {};
	document.vtree = h('document', {tvml: true});
	document.rootNode = createElement(document.vtree, {document});

	for (let i = document.childNodes.length; i; i--) {
		document.removeChild(document.childNodes.item(i - 1));
	}

	document.appendChild(document.rootNode);
	return document;
}

function createEventHandler(handlersCollection = {}) {
	return function(event, ...args) {
		const {target} = event;
		const {tagName} = target;
		const handler = handlersCollection[tagName] || handlersCollection[DEFAULT_HANDLER] || noop();

		console.log(444, tagName, event.type, event);

		return handler.call(this, event, ...args);
	}
}

function createDefaultHandler(handlerName) {
	return function({target}) {
		const {events = {}} = target;
		const handler = events[handlerName];

		if (typeof(handler) === 'function') {
			handler.apply(this, arguments);
		}
	}
}
