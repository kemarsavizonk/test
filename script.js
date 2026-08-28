const words = ["Imagine", "Create", "Explore", "Repeat"];

const title = document.querySelector("#changing-title");
const titleNumber = document.querySelector("#title-number");
const nextButton = document.querySelector("#next-word");
const progressBars = document.querySelectorAll("#progress span");

let currentWord = 0;

nextButton.addEventListener("click", () => {
  currentWord = (currentWord + 1) % words.length;

  title.textContent = words[currentWord];
  titleNumber.textContent = String(currentWord + 1).padStart(2, "0");

  progressBars.forEach((bar, index) => {
    bar.classList.toggle("active", index === currentWord);
  });

  title.classList.remove("word-in");
  void title.offsetWidth;
  title.classList.add("word-in");
});
