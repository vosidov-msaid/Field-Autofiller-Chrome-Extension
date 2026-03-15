chrome.runtime.onInstalled.addListener(() => {
  console.log("Field Autofiller installed.");
});

chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 460,
    height: 720
  });
});
