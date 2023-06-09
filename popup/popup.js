//! store templates
let popupAbortController = null;

window.addEventListener("load", async () => {
  initConfigPopup();

  const aiPromptTextArea = await registerInput("aiPromptTextArea");
  const input = await registerInput("inputTextArea");
  const aiSuggestionTextArea = await registerInput("aiSuggestionTextArea");
  const submitButton = document.getElementById("submitButton");
  submitButton.addEventListener("click", submitButtonClick);

  input.addEventListener("input", cleanupAiSuggestion);
  aiPromptTextArea.addEventListener("input", cleanupAiSuggestion);
  enableAutoComplete(aiPromptTextArea, getAIPromptHistory, deleteMRUItem);

  input.focus();
  input.select();
});

async function cleanupAiSuggestion() {
  const aiSuggestionTextArea = document.getElementById("aiSuggestionTextArea");
  aiSuggestionTextArea.value = "";
  await storeInputValue(aiSuggestionTextArea);
}

async function log(message) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  await new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "log", payload: message },
      resolve
    );
  });
}

async function registerInput(inputElementId) {
  const input = document.getElementById(inputElementId);
  const inputKey = `popupState.${inputElementId}`;
  input.value = (await getStorage(inputKey)) ?? "";
  input.addEventListener("input", () => storeInputValue(input));
  return input;
}

async function storeInputValue(input) {
  const inputElementId = input.id;
  const inputKey = `popupState.${inputElementId}`;
  await setStorage(inputKey, input.value);
}

async function submitButtonClick(event) {
  const submitButton = event.target;
  if (popupAbortController !== null) {
    submitButton.textContent = "Submit";
    popupAbortController.abort();
    popupAbortController = null;
    return;
  }
  submitButton.textContent = "Cancel";

  const openaiSecretKey = await getOpenAiSecretKey();
  const aiPromptTextArea = document.getElementById("aiPromptTextArea");
  const inputTextArea = document.getElementById("inputTextArea");
  const aiSuggestionTextArea = document.getElementById("aiSuggestionTextArea");

  await storeInputValue(aiPromptTextArea);
  await storeAIPromptToMRU(aiPromptTextArea.value);
  await cleanupAiSuggestion();
  const contextString = inputTextArea.value;
  const prompt = aiPromptTextArea.value;
  const promptColon = prompt === "" || prompt.endsWith(":") ? "" : ":";
  const aiQuery = `${prompt + promptColon} ${contextString}`;
  const temperature = document.getElementById("temperatureInput").value / 10;
  const maxTokens = await getAiMaxAITokens();

  await log(aiQuery);
  popupAbortController = new AbortController();
  await streamAnswer(
    popupAbortController,
    openaiSecretKey,
    aiQuery,
    temperature,
    maxTokens,
    (partialResponse) => {
      aiSuggestionTextArea.value += partialResponse;
    },
    async (error) => {
      aiSuggestionTextArea.value +=
        "Error occurred while streaming the answer: " + error;
      await log(error);
      popupAbortController = null;
    }
  );
  await storeInputValue(aiSuggestionTextArea);
  aiSuggestionTextArea.focus();
  aiSuggestionTextArea.select();
  popupAbortController = null;

  submitButton.textContent = "Submit";
}

function initConfigPopup() {
  const configButton = document.getElementById("configButton");
  const configPopup = document.getElementById("configPopup");
  const configForm = document.getElementById("configForm");
  const aiModelNameInput = document.getElementById("aiModelName");
  const aiMaxAITokensInput = document.getElementById("aiMaxAITokens");
  const openAIKeyInput = document.getElementById("openAIKey");
  const cancelButton = document.getElementById("cancelButton");

  configButton.addEventListener("click", showConfigPopup);
  configForm.addEventListener("submit", updateConfig);
  cancelButton.addEventListener("click", hideConfigPopup);
  document.addEventListener("click", documentClickHidesConfigPopup);

  function documentClickHidesConfigPopup(event) {
    var isClickOutsidePopup = !configForm.contains(event.target);
    if (isClickOutsidePopup) {
      hideConfigPopup();
    }
  }

  async function showConfigPopup() {
    aiModelNameInput.value = await getAiModelName();
    aiMaxAITokensInput.value = await getAiMaxAITokens();
    openAIKeyInput.value = "";
    configPopup.style.display = "flex";
  }

  async function updateConfig(e) {
    e.preventDefault();
    await setAiModelName(aiModelNameInput.value);
    await setAiMaxAITokens(aiMaxAITokensInput.value);
    if (openAIKeyInput.value !== "") {
      await setOpenAiSecretKey(openAIKeyInput.value);
    }
    hideConfigPopup();
  }

  function hideConfigPopup() {
    configPopup.style.display = "none";
  }
}
