import Quill from "quill";

const Embed = Quill.import("blots/embed");

class HandlebarsBlot extends Embed {
  static create(data) {
    const node = super.create();
    const denotationChar = document.createElement("span");
    denotationChar.className = "ql-handlebars-denotation-char";
    denotationChar.innerHTML = data.denotationChar;
    node.appendChild(denotationChar);
    node.innerHTML += data.value;
    return HandlebarsBlot.setDataValues(node, data);
  }

  static setDataValues(element, data) {
    const domNode = element;
    Object.keys(data).forEach((key) => {
      domNode.dataset[key] = data[key];
    });
    return domNode;
  }

  static value(domNode) {
    return domNode.dataset;
  }
}

HandlebarsBlot.blotName = "handlebars";
HandlebarsBlot.tagName = "span";
HandlebarsBlot.className = "handlebars";

Quill.register(HandlebarsBlot);
