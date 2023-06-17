function enableAutoComplete(textAreaInput, getDataCallback) {
  let activeSuggestionIndex = -1;
  let suggestionsContainer;

  function removeSuggestions() {
    if (suggestionsContainer) {
      suggestionsContainer.remove();
      suggestionsContainer = null;
      activeSuggestionIndex = -1;
    }
  }

  async function createSuggestionsContainer() {
    const inputValue = textAreaInput.value;

    const matches = (await getDataCallback()).filter((str) =>
      str.toLowerCase().includes(inputValue.toLowerCase())
    );

    removeSuggestions();
    if (matches.length === 0) {
      return;
    }
    suggestionsContainer = document.createElement("div");
    suggestionsContainer.classList.add("autocomplete-suggestions");
    suggestionsContainer.style.top = `${
      textAreaInput.offsetTop + textAreaInput.offsetHeight
    }px`;
    suggestionsContainer.style.left = `${textAreaInput.offsetLeft}px`;

    textAreaInput.parentNode.appendChild(suggestionsContainer);

    matches.forEach((match) => {
      const item = document.createElement("div");
      item.innerText = match;
      item.classList.add("autocomplete-suggestion");

      suggestionsContainer.appendChild(item);
    });
  }

  textAreaInput.addEventListener("input", async function () {
    await createSuggestionsContainer();
  });

  textAreaInput.addEventListener("keydown", function (e) {
    if (suggestionsContainer && suggestionsContainer.children.length) {
      if (e.key === "ArrowDown") {
        activeSuggestionIndex =
          (activeSuggestionIndex + 1) % suggestionsContainer.children.length;
      } else if (e.key === "ArrowUp") {
        if (activeSuggestionIndex < 0) {
          activeSuggestionIndex = suggestionsContainer.children.length - 1;
        } else {
          activeSuggestionIndex =
            (activeSuggestionIndex - 1 + suggestionsContainer.children.length) %
            suggestionsContainer.children.length;
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        console.log("autocomplete keydown");
        if (activeSuggestionIndex >= 0) {
          textAreaInput.value =
            suggestionsContainer.children[activeSuggestionIndex].innerText;
          removeSuggestions();
        }
      }

      if (suggestionsContainer) {
        Array.from(suggestionsContainer.children).forEach((child, i) => {
          child.classList.remove("active");
          if (i === activeSuggestionIndex) {
            child.classList.add("active");
          }
        });
      }
    }
  });

  textAreaInput.addEventListener("blur", removeSuggestions);
  textAreaInput.addEventListener("focus", createSuggestionsContainer);
}