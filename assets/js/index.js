import "./styles.css";

const collapse = document.querySelector(".collapse-container-header");

collapse.addEventListener("click", () => {
  const content = document.querySelector(".collapse-container-content");
  if (content.style.display === "none") content.style.display = "";
  else content.style.display = "none";
});
