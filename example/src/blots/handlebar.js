import Quill from "quill";

const Embed = Quill.import("blots/embed");

// Handle Bar Class Actions
class HandleBarBlot extends Embed {
  static create(data) {
    const node = super.create();
    const denotationChar = document.createElement("span");
    denotationChar.className = "ql-handlebar-denotation-char";
    return HandleBarBlot.setDataValues(node, data);
  }

  static setDataValues(element, data) {
    const domNode = element;
    Object.keys(data).forEach(key => {
      domNode.dataset[key] = data[key];
    });
    return domNode;
  }

  static value(domNode) {
    return domNode.dataset;
  }
}

HandleBarBlot.blotName = "handlebar";
HandleBarBlot.tagName = "span";
HandleBarBlot.className = "handlebar";

Quill.register(HandleBarBlot);