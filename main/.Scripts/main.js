let count;
let current;

document.getElementById('settings').addEventListener('click', function() {
    if(window.confirm("注意 OKを押すとログアウトされます")){
        window.electronAPI.accountsettings();
    }
});

document.getElementById('exit').addEventListener('click', function() {
    if (window.confirm("アプリを終了しますか?")) {
        window.electronAPI.quitApp();
    }
});

document.getElementById('change').addEventListener('click', function(){
    location.href = "./advanced.html";
});

document.getElementById('obfuscate-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const inputCode = document.getElementById('input').value;
    count = parseInt(document.getElementById('obfuscateCount').value, 10) || 1;
    current = 0;
    let result = inputCode;
    IsObfuscate = true;
    ultraUniqueProgress = 0;
    ultraUniqueProgressText.innerText = "0%";
    ultraUniqueProgressFill.style.width = ultraUniqueProgress + '%';
    ultraUniqueLoadingScreenEl.classList.remove("loaded");
    const ultraUniqueProgressInterval = setInterval(() => {
        if(IsObfuscate === true){
            setInterval(() => {
                ultraUniqueRandomSpeed = Math.floor(Math.random() * 2);
            }, 200 * count * count);
        } else {
            ultraUniqueRandomSpeed = Math.floor(Math.random() * 101 / 5);
        }
            
            if (ultraUniqueProgress <= 100) {
            ultraUniqueProgressText.innerHTML = `${ultraUniqueProgress}%`; 
            }

            if (ultraUniqueProgress >= 40 && ultraUniqueCooldown > 0) {
            ultraUniqueCooldown -= 1;
            } else if (ultraUniqueProgress >= 100 || current >= count) {
            ultraUniqueProgress = 100;
            ultraUniqueProgressText.innerHTML = '100%';
            clearInterval(ultraUniqueProgressInterval);
            
                const ultraLogined = localStorage.getItem("ultraLogined");
                if (!ultraLogined) {
                window.location.replace('.login.html');
                } else {
                ultraUniqueLoadingScreenEl.classList.add("loaded");
                }
            } else {
            ultraUniqueProgress += Math.floor(Math.random() * ultraUniqueRandomSpeed); // ランダムに進む
            }

            ultraUniqueProgressFill.style.width = ultraUniqueProgress + '%';
        }, 100);

    const output = document.getElementById('output');
    output.textContent = '難読化中...';

    const step = async () => {
        result = await window.electronAPI.obfuscateJS(result);
        current++;

        output.textContent = `難読化中... (${current}/${count})`;

        if (current < count) {
            if(count > 20){
                setTimeout(step, 100000 * count); // 100ms 待って次の難読化を実行
            } else if(count > 7){
                setTimeout(step, 50000 * count); // 100ms 待って次の難読化を実行
            } else {
                setTimeout(step, 5000 * count); // 100ms 待って次の難読化を実行
            }
            if(ultraUniqueProgress >= 100){
                ultraUniqueProgress = 99;
                ultraUniqueProgressText.innerHTML = '100%';
            }
        } else {
            IsObfuscate = false;
            ultraUniqueLoadingScreenEl.classList.add("loaded");
            output.textContent = result;
        }
    }

    setTimeout(step, 500); // 最初の一回を開始
});
document.getElementById('saveBtn').addEventListener('click', async () => {
    const code = document.getElementById('output').textContent;
    const result = await window.electronAPI.saveToFile(code);
    alert(result);
});