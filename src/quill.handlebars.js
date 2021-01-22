import Quill from "quill";
import Keys from "./constants";
import {
  attachDataValues,
  getHandlebarsCharIndex,
  hasValidChars,
  hasValidHandlebarsCharIndex,
} from "./utils";
import "./quill.handlebars.css";
import "./blots/handlebars";

class Handlebars {
  constructor(quill, options) {
    this.isOpen = false;
    this.itemIndex = 0;
    this.handlebarsCharPos = null;
    this.cursorPos = null;
    this.values = [];
    this.suspendMouseEnter = false;
    //this token is an object that may contains one key "abandoned", set to
    //true when the previous source call should be ignored in favor or a
    //more recent execution.  This token will be null unless a source call
    //is in progress.
    this.existingSourceExecutionToken = null;

    this.quill = quill;

    this.options = {
      source: null,
      renderItem(item) {
        return `${item.value}`;
      },
      renderLoading() {
        return null;
      },
      onSelect(item, insertItem) {
        insertItem(item);
      },
      handlebarsDenotationChars: ["{{"],
      showDenotationChar: true,
      allowedChars: /^[a-zA-Z0-9_]*$/,
      minChars: 0,
      maxChars: 31,
      offsetTop: 2,
      offsetLeft: 0,
      isolateCharacter: false,
      fixHandlebarsToQuill: false,
      positioningStrategy: "normal",
      defaultMenuOrientation: "bottom",
      blotName: "handlebars",
      dataAttributes: [
        "id",
        "value",
        "denotationChar",
        "link",
        "target",
        "disabled",
      ],
      linkTarget: "_blank",
      onOpen() {
        return true;
      },
      onClose() {
        return true;
      },
      // Style options
      listItemClass: "ql-handlebars-list-item",
      handlebarsContainerClass: "ql-handlebars-list-container",
      handlebarsListClass: "ql-handlebars-list",
      spaceAfterInsert: true,
    };

    Object.assign(this.options, options, {
      dataAttributes: Array.isArray(options.dataAttributes)
        ? this.options.dataAttributes.concat(options.dataAttributes)
        : this.options.dataAttributes,
    });

    //create handlebars container
    this.handlebarsContainer = document.createElement("div");
    this.handlebarsContainer.className = this.options.handlebarsContainerClass
      ? this.options.handlebarsContainerClass
      : "";
    this.handlebarsContainer.style.cssText =
      "display: none; position: absolute;";
    this.handlebarsContainer.onmousemove = this.onContainerMouseMove.bind(this);

    if (this.options.fixHandlebarsToQuill) {
      this.handlebarsContainer.style.width = "auto";
    }

    this.handlebarsList = document.createElement("ul");
    this.handlebarsList.className = this.options.handlebarsListClass
      ? this.options.handlebarsListClass
      : "";
    this.handlebarsContainer.appendChild(this.handlebarsList);

    quill.on("text-change", this.onTextChange.bind(this));
    quill.on("selection-change", this.onSelectionChange.bind(this));

    quill.keyboard.addBinding(
      {
        key: Keys.TAB,
      },
      this.selectHandler.bind(this)
    );
    quill.keyboard.bindings[Keys.TAB].unshift(
      quill.keyboard.bindings[Keys.TAB].pop()
    );

    quill.keyboard.addBinding(
      {
        key: Keys.ENTER,
      },
      this.selectHandler.bind(this)
    );
    quill.keyboard.bindings[Keys.ENTER].unshift(
      quill.keyboard.bindings[Keys.ENTER].pop()
    );

    quill.keyboard.addBinding(
      {
        key: Keys.ESCAPE,
      },
      this.escapeHandler.bind(this)
    );

    quill.keyboard.addBinding(
      {
        key: Keys.UP,
      },
      this.upHandler.bind(this)
    );

    quill.keyboard.addBinding(
      {
        key: Keys.DOWN,
      },
      this.downHandler.bind(this)
    );
  }

  selectHandler() {
    if (this.isOpen && !this.existingSourceExecutionToken) {
      this.selectItem();
      return false;
    }
    return true;
  }

  escapeHandler() {
    if (this.isOpen) {
      if (this.existingSourceExecutionToken) {
        this.existingSourceExecutionToken.abandoned = true;
      }
      this.hideHandlebarsList();
      return false;
    }
    return true;
  }

  upHandler() {
    if (this.isOpen && !this.existingSourceExecutionToken) {
      this.prevItem();
      return false;
    }
    return true;
  }

  downHandler() {
    if (this.isOpen && !this.existingSourceExecutionToken) {
      this.nextItem();
      return false;
    }
    return true;
  }

  showHandlebarsList() {
    if (this.options.positioningStrategy === "fixed") {
      document.body.appendChild(this.handlebarsContainer);
    } else {
      this.quill.container.appendChild(this.handlebarsContainer);
    }

    this.handlebarsContainer.style.visibility = "hidden";
    this.handlebarsContainer.style.display = "";
    this.handlebarsContainer.scrollTop = 0;
    this.setHandlebarsContainerPosition();
    this.setIsOpen(true);
  }

  hideHandlebarsList() {
    this.handlebarsContainer.style.display = "none";
    this.handlebarsContainer.remove();
    this.setIsOpen(false);
  }

  highlightItem(scrollItemInView = true) {
    for (let i = 0; i < this.handlebarsList.childNodes.length; i += 1) {
      this.handlebarsList.childNodes[i].classList.remove("selected");
    }

    if (
      this.itemIndex === -1 ||
      this.handlebarsList.childNodes[this.itemIndex].dataset.disabled === "true"
    ) {
      return;
    }

    this.handlebarsList.childNodes[this.itemIndex].classList.add("selected");

    if (scrollItemInView) {
      const itemHeight = this.handlebarsList.childNodes[this.itemIndex]
        .offsetHeight;
      const itemPos = this.handlebarsList.childNodes[this.itemIndex].offsetTop;
      const containerTop = this.handlebarsContainer.scrollTop;
      const containerBottom =
        containerTop + this.handlebarsContainer.offsetHeight;

      if (itemPos < containerTop) {
        // Scroll up if the item is above the top of the container
        this.handlebarsContainer.scrollTop = itemPos;
      } else if (itemPos > containerBottom - itemHeight) {
        // scroll down if any part of the element is below the bottom of the container
        this.handlebarsContainer.scrollTop +=
          itemPos - containerBottom + itemHeight;
      }
    }
  }

  getItemData() {
    const { link } = this.handlebarsList.childNodes[this.itemIndex].dataset;
    const hasLinkValue = typeof link !== "undefined";
    const itemTarget = this.handlebarsList.childNodes[this.itemIndex].dataset
      .target;
    if (hasLinkValue) {
      this.handlebarsList.childNodes[
        this.itemIndex
      ].dataset.value = `<a href="${link}" target=${itemTarget ||
        this.options.linkTarget}>${
        this.handlebarsList.childNodes[this.itemIndex].dataset.value
      }`;
    }
    return this.handlebarsList.childNodes[this.itemIndex].dataset;
  }

  onContainerMouseMove() {
    this.suspendMouseEnter = false;
  }

  selectItem() {
    if (this.itemIndex === -1) {
      return;
    }
    const data = this.getItemData();
    if (data.disabled) {
      return;
    }
    this.options.onSelect(data, (asyncData) => {
      this.insertItem(asyncData);
    });
    this.hideHandlebarsList();
  }

  insertItem(data, programmaticInsert) {
    const render = data;
    if (render === null) {
      return;
    }
    if (!this.options.showDenotationChar) {
      render.denotationChar = "";
    }

    var insertAtPos;

    if (!programmaticInsert) {
      insertAtPos = this.handlebarsCharPos;
      this.quill.deleteText(
        this.handlebarsCharPos,
        this.cursorPos - this.handlebarsCharPos,
        Quill.sources.USER
      );
    } else {
      insertAtPos = this.cursorPos;
    }
    this.quill.insertEmbed(
      insertAtPos,
      this.options.blotName,
      render,
      Quill.sources.USER
    );
    if (this.options.spaceAfterInsert) {
      this.quill.insertText(insertAtPos + 1, " ", Quill.sources.USER);
      // setSelection here sets cursor position
      this.quill.setSelection(insertAtPos + 2, Quill.sources.USER);
    } else {
      this.quill.setSelection(insertAtPos + 1, Quill.sources.USER);
    }
    this.hideHandlebarsList();
  }

  onItemMouseEnter(e) {
    if (this.suspendMouseEnter) {
      return;
    }

    const index = Number(e.target.dataset.index);

    if (!Number.isNaN(index) && index !== this.itemIndex) {
      this.itemIndex = index;
      this.highlightItem(false);
    }
  }

  onDisabledItemMouseEnter(e) {
    if (this.suspendMouseEnter) {
      return;
    }

    this.itemIndex = -1;
    this.highlightItem(false);
  }

  onItemClick(e) {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    this.itemIndex = e.currentTarget.dataset.index;
    this.highlightItem();
    this.selectItem();
  }

  onItemMouseDown(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  renderLoading() {
    var renderedLoading = this.options.renderLoading();
    if (!renderedLoading) {
      return;
    }

    if (
      this.handlebarsContainer.getElementsByClassName("ql-handlebars-loading")
        .length > 0
    ) {
      this.showHandlebarsList();
      return;
    }

    this.handlebarsList.innerHTML = "";
    var loadingDiv = document.createElement("div");
    loadingDiv.className = "ql-handlebars-loading";
    loadingDiv.innerHTML = this.options.renderLoading();
    this.handlebarsContainer.append(loadingDiv);
    this.showHandlebarsList();
  }

  removeLoading() {
    var loadingDiv = this.handlebarsContainer.getElementsByClassName(
      "ql-handlebars-loading"
    );
    if (loadingDiv.length > 0) {
      loadingDiv[0].remove();
    }
  }

  renderList(handlebarsChar, data, searchTerm) {
    if (data && data.length > 0) {
      this.removeLoading();

      this.values = data;
      this.handlebarsList.innerHTML = "";

      var initialSelection = -1;

      for (let i = 0; i < data.length; i += 1) {
        const li = document.createElement("li");
        li.className = this.options.listItemClass
          ? this.options.listItemClass
          : "";
        if (data[i].disabled) {
          li.className += " disabled";
        } else if (initialSelection === -1) {
          initialSelection = i;
        }
        li.dataset.index = i;
        li.innerHTML = this.options.renderItem(data[i], searchTerm);
        if (!data[i].disabled) {
          li.onmouseenter = this.onItemMouseEnter.bind(this);
          li.onmouseup = this.onItemClick.bind(this);
          li.onmousedown = this.onItemMouseDown.bind(this);
        } else {
          li.onmouseenter = this.onDisabledItemMouseEnter.bind(this);
        }
        li.dataset.denotationChar = handlebarsChar;
        this.handlebarsList.appendChild(
          attachDataValues(li, data[i], this.options.dataAttributes)
        );
      }
      this.itemIndex = initialSelection;
      this.highlightItem();
      this.showHandlebarsList();
    } else {
      this.hideHandlebarsList();
    }
  }

  nextItem() {
    var increment = 0;
    var newIndex;

    do {
      increment++;
      newIndex = (this.itemIndex + increment) % this.values.length;
      var disabled =
        this.handlebarsList.childNodes[newIndex].dataset.disabled === "true";
      if (increment === this.values.length + 1) {
        //we've wrapped around w/o finding an enabled item
        newIndex = -1;
        break;
      }
    } while (disabled);

    this.itemIndex = newIndex;
    this.suspendMouseEnter = true;
    this.highlightItem();
  }

  prevItem() {
    var decrement = 0;
    var newIndex;

    do {
      decrement++;
      newIndex =
        (this.itemIndex + this.values.length - decrement) % this.values.length;
      var disabled =
        this.handlebarsList.childNodes[newIndex].dataset.disabled === "true";
      if (decrement === this.values.length + 1) {
        //we've wrapped around w/o finding an enabled item
        newIndex = -1;
        break;
      }
    } while (disabled);

    this.itemIndex = newIndex;
    this.suspendMouseEnter = true;
    this.highlightItem();
  }

  containerBottomIsNotVisible(topPos, containerPos) {
    const handlebarsContainerBottom =
      topPos + this.handlebarsContainer.offsetHeight + containerPos.top;
    return handlebarsContainerBottom > window.pageYOffset + window.innerHeight;
  }

  containerRightIsNotVisible(leftPos, containerPos) {
    if (this.options.fixHandlebarsToQuill) {
      return false;
    }

    const rightPos =
      leftPos + this.handlebarsContainer.offsetWidth + containerPos.left;
    const browserWidth =
      window.pageXOffset + document.documentElement.clientWidth;
    return rightPos > browserWidth;
  }

  setIsOpen(isOpen) {
    if (this.isOpen !== isOpen) {
      if (isOpen) {
        this.options.onOpen();
      } else {
        this.options.onClose();
      }
      this.isOpen = isOpen;
    }
  }

  setHandlebarsContainerPosition() {
    if (this.options.positioningStrategy === "fixed") {
      this.setHandlebarsContainerPosition_Fixed();
    } else {
      this.setHandlebarsContainerPosition_Normal();
    }
  }

  setHandlebarsContainerPosition_Normal() {
    const containerPos = this.quill.container.getBoundingClientRect();
    const handlebarsCharPos = this.quill.getBounds(this.handlebarsCharPos);
    const containerHeight = this.handlebarsContainer.offsetHeight;

    let topPos = this.options.offsetTop;
    let leftPos = this.options.offsetLeft;

    // handle horizontal positioning
    if (this.options.fixHandlebarsToQuill) {
      const rightPos = 0;
      this.handlebarsContainer.style.right = `${rightPos}px`;
    } else {
      leftPos += handlebarsCharPos.left;
    }

    if (this.containerRightIsNotVisible(leftPos, containerPos)) {
      const containerWidth =
        this.handlebarsContainer.offsetWidth + this.options.offsetLeft;
      const quillWidth = containerPos.width;
      leftPos = quillWidth - containerWidth;
    }

    // handle vertical positioning
    if (this.options.defaultMenuOrientation === "top") {
      // Attempt to align the handlebars container with the top of the quill editor
      if (this.options.fixHandlebarsToQuill) {
        topPos = -1 * (containerHeight + this.options.offsetTop);
      } else {
        topPos =
          handlebarsCharPos.top - (containerHeight + this.options.offsetTop);
      }

      // default to bottom if the top is not visible
      if (topPos + containerPos.top <= 0) {
        let overHandlebarsCharPos = this.options.offsetTop;

        if (this.options.fixHandlebarsToQuill) {
          overHandlebarsCharPos += containerPos.height;
        } else {
          overHandlebarsCharPos += handlebarsCharPos.bottom;
        }

        topPos = overHandlebarsCharPos;
      }
    } else {
      // Attempt to align the handlebars container with the bottom of the quill editor
      if (this.options.fixHandlebarsToQuill) {
        topPos += containerPos.height;
      } else {
        topPos += handlebarsCharPos.bottom;
      }

      // default to the top if the bottom is not visible
      if (this.containerBottomIsNotVisible(topPos, containerPos)) {
        let overHandlebarsCharPos = this.options.offsetTop * -1;

        if (!this.options.fixHandlebarsToQuill) {
          overHandlebarsCharPos += handlebarsCharPos.top;
        }

        topPos = overHandlebarsCharPos - containerHeight;
      }
    }

    if (topPos >= 0) {
      this.options.handlebarsContainerClass.split(" ").forEach((className) => {
        this.handlebarsContainer.classList.add(`${className}-bottom`);
        this.handlebarsContainer.classList.remove(`${className}-top`);
      });
    } else {
      this.options.handlebarsContainerClass.split(" ").forEach((className) => {
        this.handlebarsContainer.classList.add(`${className}-top`);
        this.handlebarsContainer.classList.remove(`${className}-bottom`);
      });
    }

    this.handlebarsContainer.style.top = `${topPos}px`;
    this.handlebarsContainer.style.left = `${leftPos}px`;
    this.handlebarsContainer.style.visibility = "visible";
  }

  setHandlebarsContainerPosition_Fixed() {
    this.handlebarsContainer.style.position = "fixed";
    this.handlebarsContainer.style.height = null;

    const containerPos = this.quill.container.getBoundingClientRect();
    const handlebarsCharPos = this.quill.getBounds(this.handlebarsCharPos);
    const handlebarsCharPosAbsolute = {
      left: containerPos.left + handlebarsCharPos.left,
      top: containerPos.top + handlebarsCharPos.top,
      width: 0,
      height: handlebarsCharPos.height,
    };

    //Which rectangle should it be relative to
    const relativeToPos = this.options.fixHandlebarsToQuill
      ? containerPos
      : handlebarsCharPosAbsolute;

    let topPos = this.options.offsetTop;
    let leftPos = this.options.offsetLeft;

    // handle horizontal positioning
    if (this.options.fixHandlebarsToQuill) {
      const rightPos = relativeToPos.right;
      this.handlebarsContainer.style.right = `${rightPos}px`;
    } else {
      leftPos += relativeToPos.left;

      //if its off the righ edge, push it back
      if (
        leftPos + this.handlebarsContainer.offsetWidth >
        document.documentElement.clientWidth
      ) {
        leftPos -=
          leftPos +
          this.handlebarsContainer.offsetWidth -
          document.documentElement.clientWidth;
      }
    }

    const availableSpaceTop = relativeToPos.top;
    const availableSpaceBottom =
      document.documentElement.clientHeight -
      (relativeToPos.top + relativeToPos.height);

    const fitsBottom =
      this.handlebarsContainer.offsetHeight <= availableSpaceBottom;
    const fitsTop = this.handlebarsContainer.offsetHeight <= availableSpaceTop;

    var placement;

    if (this.options.defaultMenuOrientation === "top" && fitsTop) {
      placement = "top";
    } else if (this.options.defaultMenuOrientation === "bottom" && fitsBottom) {
      placement = "bottom";
    } else {
      //it doesnt fit either so put it where there's the most space
      placement = availableSpaceBottom > availableSpaceTop ? "bottom" : "top";
    }

    if (placement === "bottom") {
      topPos = relativeToPos.top + relativeToPos.height;
      if (!fitsBottom) {
        //shrink it to fit
        //3 is a bit of a fudge factor so it doesnt touch the edge of the screen
        this.handlebarsContainer.style.height = availableSpaceBottom - 3 + "px";
      }

      this.options.handlebarsContainerClass.split(" ").forEach((className) => {
        this.handlebarsContainer.classList.add(`${className}-bottom`);
        this.handlebarsContainer.classList.remove(`${className}-top`);
      });
    } else {
      topPos = relativeToPos.top - this.handlebarsContainer.offsetHeight;
      if (!fitsTop) {
        //shrink it to fit
        //3 is a bit of a fudge factor so it doesnt touch the edge of the screen
        this.handlebarsContainer.style.height = availableSpaceTop - 3 + "px";
        topPos = 3;
      }

      this.options.handlebarsContainerClass.split(" ").forEach((className) => {
        this.handlebarsContainer.classList.add(`${className}-top`);
        this.handlebarsContainer.classList.remove(`${className}-bottom`);
      });
    }

    this.handlebarsContainer.style.top = `${topPos}px`;
    this.handlebarsContainer.style.left = `${leftPos}px`;
    this.handlebarsContainer.style.visibility = "visible";
  }

  getTextBeforeCursor() {
    const startPos = Math.max(0, this.cursorPos - this.options.maxChars);
    const textBeforeCursorPos = this.quill.getText(
      startPos,
      this.cursorPos - startPos
    );
    return textBeforeCursorPos;
  }

  onSomethingChange() {
    const range = this.quill.getSelection();
    if (range == null) return;

    this.cursorPos = range.index;
    const textBeforeCursor = this.getTextBeforeCursor();
    const { handlebarsChar, handlebarsCharIndex } = getHandlebarsCharIndex(
      textBeforeCursor,
      this.options.handlebarsDenotationChars
    );

    if (
      hasValidHandlebarsCharIndex(
        handlebarsCharIndex,
        textBeforeCursor,
        this.options.isolateCharacter
      )
    ) {
      const handlebarsCharPos =
        this.cursorPos - (textBeforeCursor.length - handlebarsCharIndex);
      this.handlebarsCharPos = handlebarsCharPos;
      const textAfter = textBeforeCursor.substring(
        handlebarsCharIndex + handlebarsChar.length
      );
      if (
        textAfter.length >= this.options.minChars &&
        hasValidChars(textAfter, this.getAllowedCharsRegex(handlebarsChar))
      ) {
        if (this.existingSourceExecutionToken) {
          this.existingSourceExecutionToken.abandoned = true;
        }
        this.renderLoading();
        var sourceRequestToken = {
          abandoned: false,
        };
        this.existingSourceExecutionToken = sourceRequestToken;
        this.options.source(
          textAfter,
          (data, searchTerm) => {
            if (sourceRequestToken.abandoned) {
              return;
            }
            this.existingSourceExecutionToken = null;
            this.renderList(handlebarsChar, data, searchTerm);
          },
          handlebarsChar
        );
      } else {
        this.hideHandlebarsList();
      }
    } else {
      this.hideHandlebarsList();
    }
  }

  getAllowedCharsRegex(denotationChar) {
    if (this.options.allowedChars instanceof RegExp) {
      return this.options.allowedChars;
    } else {
      return this.options.allowedChars(denotationChar);
    }
  }

  onTextChange(delta, oldDelta, source) {
    if (source === "user") {
      this.onSomethingChange();
    }
  }

  onSelectionChange(range) {
    if (range && range.length === 0) {
      this.onSomethingChange();
    } else {
      this.hideHandlebarsList();
    }
  }

  openMenu(denotationChar) {
    var selection = this.quill.getSelection(true);
    this.quill.insertText(selection.index, denotationChar);
    this.quill.blur();
    this.quill.focus();
  }
}

Quill.register("modules/handlebars", Handlebars);

export default Handlebars;
