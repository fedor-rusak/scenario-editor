'use strict';
/**
 *  This code allows me to have nice animated tree view in browser
 *  with these awesome features:
 *   1) closing/opening subtrees
 *   2) checkbox (with halfcheckbox state!) to choose specific elements and subtrees
 *   3) API to add and remove nodes in JS
 *   4) no react, jquery, 3rd party dependency
 *
 *  I was inspired by UX and style from https://github.com/daweilv/treejs
 *  Some implementation ideas were taken from https://github.com/m-thalmann/treejs
 */
const TreeStump = function() {
	const CSS_CLASSES = {
		'container': 'ts-view',
		'ul': 'ts-nodes',
		'li': 'ts-node',
		'li_closed': 'ts-node__close',
		'checkbox': 'ts-checkbox',
		'checkbox_halfchecked': 'ts-node__halfchecked',
		'checkbox_checked': 'ts-node__checked',
		'switcher': 'ts-switcher',
		'switcher_closed': 'ts-switcher-closed',
		'label': 'ts-label',
		'padding': 'ts-placeholder'
	}
	const createTSView = (containerParam, root) => {
		let container = containerParam;
		if (!utils.isDOM(containerParam)) {
			container = document.querySelector(containerParam);
			if (container instanceof Array) {
				container = container[0];
			}
			if (!utils.isDOM(container)) {
				throw new Error('TS view 1 must be DOM-Object or CSS-QuerySelector (#, .)');
			}
		}
		if (root) {
			if (typeof root === 'undefined' || !(root.getTitle && root.getTitle() && root.getId && root.getId())) {
				throw new Error('TS view (optional) 2 parameter must implement getTitle and getId.');
			}
		}
		const self = {};
		const state = {index: {}, liElements: {}, root};
		self.getRoot = () => {
			return state.root;
		}
		self.setRoot = (root) => {
			state.root = root;
		}
		self.setCheckboxEventListener = (listener) => {
			state.onCheckboxEventListener = listener;
		}
		self.render = () => {
			state.index = [];
			state.index[state.root.getId(), state.root];
			if (container.firstChild) {
				container.removeChild(container.firstChild);
			}
			state.index = {};
			state.liElements = {};
			const topUl = utils.getUl();
			topUl.appendChild(renderNode(state.root));
			container.appendChild(topUl);
		}
		const checkboxClickListener = (e) => {
			e.stopPropagation();
			const currentElement = e.target;
			if (!currentElement.classList.contains(CSS_CLASSES.checkbox)) {
				return false;
			}
			
			const nodeId = currentElement.parentElement.getAttribute('data-id');
			if (nodeId === undefined) {
				return false;
			}
			
			const toggleNode = state.index[nodeId];
			const toCheck = toggleNode.getCheckedState() == 0;
			toggleCheckboxForSubtree(toCheck, toggleNode, state.liElements);
			toggleParentCheckbox(toggleNode, state.liElements);
			if (state.onCheckboxEventListener) {
				state.onCheckboxEventListener(state.root);
			}
			return false;
		};
		const switcherClickListener = (e) => {
			e.stopPropagation();
			const currentElement = e.target;
			if (!currentElement.classList.contains(CSS_CLASSES.switcher)) {
				return false;
			}
			
			const nodeId = currentElement.parentElement.getAttribute('data-id');
			if (nodeId === undefined) {
				return false;
			}
			
			state.index[nodeId].toggleExpanded();
			const toggledLi = e.target.parentNode;
			const nestedUl = toggledLi.lastChild;
			const isClosing = !toggledLi.classList.contains(CSS_CLASSES.li_closed);
			animateToggle(isClosing, toggledLi, nestedUl, currentElement);
			return false;
		};
		const renderNode = (node) => {
			state.index[node.getId()] = node;
			const liElement = utils.getLi();
			state.liElements[node.getId()] = liElement;
			if (!node.isExpanded() && !node.isLeaf()) {
				liElement.classList.add(CSS_CLASSES.li_closed);
			}
			let checkedState = node.getCheckedState();
			if (checkedState === 1) {
				liElement.classList.add(CSS_CLASSES.checkbox_halfchecked);
			}
			else if (checkedState === 2) {
				liElement.classList.add(CSS_CLASSES.checkbox_checked);
			}
			liElement.setAttribute('data-id', node.getId());
			if (!node.isLeaf()) {
				const switcher = utils.getSpan(CSS_CLASSES.switcher);
				if (!node.isExpanded()) {
					switcher.classList.add(CSS_CLASSES.switcher_closed);
				}
				liElement.appendChild(switcher);
			}
			liElement.appendChild(utils.getSpan(CSS_CLASSES.checkbox));
			liElement.appendChild(utils.getSpan(CSS_CLASSES.label, node.getTitle()));
			if (!node.isLeaf()) {
				const ulElement = utils.getUl();
				node.getChildren().forEach((child) => {
					ulElement.appendChild(renderNode(child));
				});
				liElement.appendChild(ulElement)
			}
			else {
				liElement.classList.add(CSS_CLASSES.padding);
			}
			return liElement;
		}
		container.classList.add(CSS_CLASSES.container);
		container.addEventListener('click', checkboxClickListener);
		container.addEventListener('click', switcherClickListener);
		if (state.root) {self.render();}
		return self;
	}
	const createTSNode = (title, data) => {
		if (typeof title !== 'string') {
			throw new Error('TS Node 1 parameter must be String');
		}
		const self = {};
		const state = {
			title,
			expanded: true,
			checked: false,
			id: utils.getNextSequenceValue(),
			children: [],
			parent: undefined,
			data: data ? JSON.parse(JSON.stringify(data)) : undefined
		};
		self.addChild = (node) => {
			if (node.getTitle && node.getTitle() && node.getId && node.getId())  {
				state.children.push(node);
				node.setParent(self);
			}
			else {
				throw new Error('Parameter must implement getTitle and getId.');
			}
		}
		const getIndexOfChild = (self, node) => {
			for(let i = 0; i < self.children.length; i++){
				if (self.children[i].equals(node)) {
					return i;
				}
			}
			return -1;
		}
		self.removeChild = (node) => {
			for(let i = 0; i < self.children.length; i++){
				if (self.children[i].equals(node)) {
					state.children.splice(index, 1);
					return;
				}
			}
			throw new Error('Can\'t remove unrelated node');
		}
		self.getChildren = () => {
			return [].concat(state.children);
		}
		self.getTitle = () => {
			return state.title;
		}
		self.setTitle = (title) => {
			if (typeof title !== 'string') {
				throw new Error("Title must be of string type");
			}
			state.title = title;
		}
		self.getId = () => {
			return state.id;
		}
		self.setParent = (node) => {
			state.parent = node;
		}
		self.getParent = () => {
			return state.parent;
		}
		self.isLeaf = () => {
			return state.children.length === 0;
		}
		self.toggleExpanded = () => {
			if (self.isLeaf()) {
				return;
			}
			state.expanded = !state.expanded;
		};
		self.isExpanded = () => {
			if (self.isLeaf()) {
				return false;
			}
			return state.expanded;
		}
		self.setChecked = () => {
			state.checked = 2;
		};
		self.setHalfChecked = () => {
			state.checked = 1;
		};
		self.setUnchecked = () => {
			state.checked = 0;
		};
		self.getCheckedState = () => {
			return state.checked;
		}
		self.getData = () => {
			return state.data ? JSON.parse(JSON.stringify(state.data)) : undefined;
		}
		self.setData = (data) => {
			self.data = JSON.parse(JSON.stringify(data));
		}
		self.equals = (node) => {
			if (node.getTitle && node.getTitle() && node.getId && node.getId()) {
				if (node.getTitle() === state.title && node.getId() === state.id) {
					return true;
				}
			}
			return false;
		}
		self.createLeaf = (title, data) => {
			const leaf = createTSNode(title, data);
			self.addChild(leaf);
			leaf.setParent(self);
			return leaf;
		}
		self.serialize = () => {
			let children = undefined;
			if (state.children.length >0) {
				children = [];
				for (let i = 0; i < state.children.length; i++) {
					children.push(state.children[i].serialize());
				}
			}
			return {title: state.title, data: state.data, children: children};
		}
		return self;
	}
	const ulStyle = (isClosing, ul, height) => {
		if (isClosing) {
			ul.style.height = 0;
			ul.style.opacity = 0;
		}
		else  {
			ul.style.height = height + 'px';
			ul.style.opacity = 1;
		}
	}
	const animateToggle = (isClosing, li, ul, switcher) => {
		const height = ul.scrollHeight;
		requestAnimationFrame(() => {
			ulStyle(!isClosing, ul, height);
			requestAnimationFrame(() => {
				ulStyle(isClosing, ul, height)
				setTimeout(() => {
					ul.style.height = '';
					ul.style.opacity = '';
					if (isClosing) {
						li.classList.add(CSS_CLASSES.li_closed);
						switcher.classList.add(CSS_CLASSES.switcher_closed);
					}
					else {
						li.classList.remove(CSS_CLASSES.li_closed);
						switcher.classList.remove(CSS_CLASSES.switcher_closed);
					}
				}, 150);
			});
		});
	}
	const toggleCheckBox = (toCheck, node, liElements) => {
		toCheck ? node.setChecked()
				: node.setUnchecked();
		const liElement = liElements[node.getId()];
		liElement.classList.remove(CSS_CLASSES.checkbox_halfchecked);
		toCheck ? liElement.classList.add(CSS_CLASSES.checkbox_checked)
				: liElement.classList.remove(CSS_CLASSES.checkbox_checked)
	}
	const toggleCheckboxForSubtree = (toCheck, startNode, liElements) => {
		toggleCheckBox(toCheck, startNode, liElements);
		startNode.getChildren().forEach((child) => {
			toggleCheckboxForSubtree(toCheck, child, liElements);
		});
	}
	const toggleParentCheckbox = (node, liElements) => {
		let parent = node.getParent();
		if (parent === undefined) {
			return
		}
		let unchecked = 0;
		let halfchecked = 0;
		let checked = 0;
		let childrenCount = parent.getChildren().length;
		parent.getChildren().forEach((child) => {
			if (child.getCheckedState() === 2) {
				checked++;
			}
			else if (child.getCheckedState() === 1) {
				halfchecked++;
			}
			else {
				unchecked++;
			}
		});
		const liElement = liElements[parent.getId()];
		if (unchecked === childrenCount) {
			liElement.classList.remove(CSS_CLASSES.checkbox_checked);
			liElement.classList.remove(CSS_CLASSES.checkbox_halfchecked);
			parent.setUnchecked();
		}
		else if (checked === childrenCount) {
			liElement.classList.remove(CSS_CLASSES.checkbox_halfchecked);
			liElement.classList.add(CSS_CLASSES.checkbox_checked);
			parent.setChecked();	
		}
		else {
			liElement.classList.add(CSS_CLASSES.checkbox_halfchecked);
			liElement.classList.remove(CSS_CLASSES.checkbox_checked);
			parent.setHalfChecked();	
		}
		toggleParentCheckbox(parent, liElements);
	}
	let counter = 0;
	const utils = {
		isDOM: (obj) => {
			try {
				return obj instanceof HTMLElement;
			}
			catch (e) {
				return false;
			}
		},
		getUl: () => {
			const ul = document.createElement('ul');
			ul.className = CSS_CLASSES.ul;
			return ul;
		},
		getLi: () => {
			const li = document.createElement('li');
			li.className = CSS_CLASSES.li;
			return li;
		},
		getSpan: (classes, value) => {
			const span = document.createElement('span');
			span.className = classes;
			if (value) {span.textContent = value;}
			return span;
		},
		getNextSequenceValue: () => {
			return ++counter + '';
		}
	};
	return {createTSNode, createTSView};
}();