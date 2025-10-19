const button = document.getElementById("signup");
button.addEventListener('click', function(){
    window.electronAPI.OpenURL("https://asakura-wiki.vercel.app/login/signup");
    window.location.replace("./.login.html");
});