chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "getFAnswer",
    title: "Get the F* Answer",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "getFAnswer") {
    const selectedText = info.selectionText;

    console.log("🟨 Selected Text:");
    console.log(selectedText);

    const prompt = `You are given a multiple-choice question with four options. Return only the correct answer text, exactly as it appears (no extra explanation, no letter, just the correct option text).

${selectedText}

Answer:`;

    console.log("🟦 Final Prompt Sent to Gemini:");
    console.log(prompt);

    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=YOUR_KEY", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      const data = await res.json();
      console.log("📦 Full Gemini Response:");
      console.log(JSON.stringify(data, null, 2));
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Unable to get answer";

      console.log("🟩 Raw Answer from Gemini:");
      console.log(raw);

      const answerText = raw.trim().toLowerCase();

      if (answerText) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },  // FIX: Use tab.id instead of tabId
          func: (answer) => {
            const lowerAnswer = answer.toLowerCase();
            const allElements = document.querySelectorAll('input[type="radio"], input[type="checkbox"], button, div, span, label, li');

            let clicked = false;
            for (const el of allElements) {
              const text = el.innerText?.trim().toLowerCase();
              if (text && text.includes(lowerAnswer)) {
                el.click();
                console.log("✅ Clicked element with answer text:", answer);
                clicked = true;
                break;
              }
            }

            function showToast(msg) {
              const toast = document.createElement("div");
              toast.innerText = msg;

              const close = document.createElement("span");
              close.innerText = " ×";
              close.style.marginLeft = "10px";
              close.style.cursor = "pointer";
              close.style.fontWeight = "bold";
              close.onclick = () => toast.remove();

              toast.appendChild(close);
              toast.style.position = "fixed";
              toast.style.bottom = "30px";
              toast.style.right = "30px";
              toast.style.background = "#1e1e1e";
              toast.style.color = "#fff";
              toast.style.padding = "12px 18px";
              toast.style.borderRadius = "8px";
              toast.style.fontFamily = "sans-serif";
              toast.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
              toast.style.zIndex = 999999;
              toast.style.maxWidth = "300px";

              document.body.appendChild(toast);

              // Auto-remove after 6 seconds
              setTimeout(() => toast.remove(), 6000);
            }

            if (clicked) {
              showToast(" " + answer);
            } else {
              showToast("❌ Couldn't auto-select. Try manually: " + answer);
            }
          },
          args: [answerText]
        });

      } else {
        alert("Gemini gave no usable answer. Try again.");
      }

    } catch (error) {
      console.error("🔥 ERROR: Gemini fetch failed", error);
    }
  }
});
