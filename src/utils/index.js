function attachDataValues(element, data, dataAttributes) {
  const handlebars = element;
  Object.keys(data).forEach((key) => {
    if (dataAttributes.indexOf(key) > -1) {
      handlebars.dataset[key] = data[key];
    } else {
      delete handlebars.dataset[key];
    }
  });
  return handlebars;
}

function getHandlebarsCharIndex(text, handlebarsDenotationChars) {
  return handlebarsDenotationChars.reduce(
    (prev, handlebarsChar) => {
      const handlebarsCharIndex = text.lastIndexOf(handlebarsChar);

      if (handlebarsCharIndex > prev.handlebarsCharIndex) {
        return {
          handlebarsChar,
          handlebarsCharIndex,
        };
      }
      return {
        handlebarsChar: prev.handlebarsChar,
        handlebarsCharIndex: prev.handlebarsCharIndex,
      };
    },
    { handlebarsChar: null, handlebarsCharIndex: -1 }
  );
}

function hasValidChars(text, allowedChars) {
  return allowedChars.test(text);
}

function hasValidHandlebarsCharIndex(handlebarsCharIndex, text, isolateChar) {
  if (handlebarsCharIndex > -1) {
    if (
      isolateChar &&
      !(
        handlebarsCharIndex === 0 ||
        !!text[handlebarsCharIndex - 1].match(/\s/g)
      )
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export {
  attachDataValues,
  getHandlebarsCharIndex,
  hasValidChars,
  hasValidHandlebarsCharIndex,
};
