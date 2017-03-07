import assign from 'object-assign';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';

import {broadcast} from './event-bus';
import {promisedTimeout} from './utils';
import CustomNode from './render/custom-node';
import {passthrough, createPipeline} from './pipelines';
import {vdomToDocument, createEmptyDocument, attachEventListeners} from './render/document';

let hasModal = false;

const RENDERING_ANIMATION = 500;

export function render(template) {
	return createPipeline()
		// .pipe(parseDocument(template))
		.pipe(resolveTemplate(template))
		.pipe(passthrough(payload => {
			const {
				vtree,
				route,
				redirect,
				navigation = {},
			} = payload;

			let {document: renderedDocument} = payload;
			let document = renderedDocument;

			const {menuBar, menuItem} = navigation;
			const [prevRouteDocument] = navigationDocument.documents.slice(-1);

			if (menuBar && menuItem) {
				const menuItemDocument = menuBar.getDocument(menuItem);

				console.log(100, menuItemDocument);

				if (menuItemDocument) {
					document = menuItemDocument;
				} else {
					document = attachEventListeners(createEmptyDocument());
					document.route = route;
					setTimeout(() => menuBar.setDocument(document, menuItem), RENDERING_ANIMATION);
				}
			} else if (redirect && prevRouteDocument) {
				document = prevRouteDocument;
				document.route = route;
			} else if (!renderedDocument) {
				document = attachEventListeners(createEmptyDocument());
				document.prevRouteDocument = prevRouteDocument;
				document.route = route;
				renderedDocument || navigationDocument.pushDocument(document);
			}

			console.log(111, payload, route, document);
			console.log(222, document.vtree, vtree, diff(document.vtree, vtree));

			document.rootNode = patch(document.rootNode, diff(document.vtree, vtree));
			document.vtree = vtree;

			console.log(333, document.rootNode.outerHTML);

			return {document, redirect: false};

			/*const {menuBar, menuItem} = navigation;
			const prevRouteDocument = renderedDocument ? renderedDocument.prevRouteDocument : navigationDocument.documents.slice(-1)[0];

			document.route = route;
			document.prevRouteDocument = prevRouteDocument;

			if (prevRouteDocument === renderedDocument) {
				document.prevRouteDocument = null;
			}

			if (hasModal) removeModal();

			if (redirect && prevRouteDocument) {
				renderedDocument = prevRouteDocument;
			}

			if (menuBar && menuItem) {
				const menuItemDocument = menuBar.getDocument(menuItem);

				if (menuItemDocument !== document) {
					menuBar.setDocument(document, menuItem);
				}
			} else if (renderedDocument) {
				navigationDocument.replaceDocument(document, renderedDocument);
			} else {
				navigationDocument.pushDocument(document);
			}

			return {document, redirect: false};*/
		}))
		// .pipe(passthrough(() => promisedTimeout(RENDERING_ANIMATION)));
}

export function renderModal(template) {
	return createPipeline()
		.pipe(passthrough(() => {
			if (!hasModal) return;
			removeModal();
			return promisedTimeout(RENDERING_ANIMATION);
		}))
		.pipe(parseDocument(template))
		.pipe(passthrough(({parsedDocument: document, route}) => {
			hasModal = true;
			document.modal = true;
			document.route = route || (navigationDocument.documents.pop() || {}).route;
			navigationDocument.presentModal(document);
		}));
}

export function parseDocument(template) {
	return createPipeline().pipe(passthrough(payload => ({
		parsedDocument: createDocument(template, payload),
	})));
}

export function removeModal() {
	hasModal = false;
	navigationDocument.dismissModal(true);
}

function createDocument(template, payload) {
	if (typeof(template) === 'string') {
		throw `String templates aren't supported. Use jsx templates.`
	}

	if (typeof(template) === 'function') {
		template = template(payload);
	}

	if (typeof(template) === 'object' && template) {
		return vdomToDocument(template, payload);
	}

	return createEmptyDocument();
}

function resolveTemplate(template) {
	return createPipeline().pipe(passthrough(payload => {
		if (typeof(template) === 'string') {
			throw `String templates aren't supported. Use jsx templates.`
		}

		if (typeof(template) === 'function') {
			template = template(payload);
		}

		if (template instanceof CustomNode) {
			template = template.toNode(payload);
		}

		return {vtree: template};
	}));
}
