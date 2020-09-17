document.getElementById("buttony").addEventListener("click", (event) => {
    event.preventDefault();

    const accessToken = document.getElementsByName("accessToken")[0].value;
    storeAccessToken(accessToken);
});

function storeAccessToken(accessToken) {
    localStorage.setItem("accessToken", accessToken);
    location.href = "../index.html";
}
