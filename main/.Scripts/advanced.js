const tsInput = document.getElementById('ts-input');
let tsCount = document.getElementById('ts-count');
const tsOutput = document.getElementById('ts-output');
const tsObfuscateForm = document.getElementById('obfuscate-form');
const saveTSasJSBtn = document.getElementById('save-ts-as-js');
const ChangeToJavascript = document.getElementById('change');
let step;
let currentCode;
let current;

ChangeToJavascript.addEventListener('click', function(){
    location.href = "./index.html";
});

tsObfuscateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = tsInput.value;
    tsCount = parseInt(tsCount.value, 10) || 1;

    step = 0;
    currentCode = code;

    obfuscateStep();
});

saveTSasJSBtn.addEventListener('click', () => {
    const tsCode = document.getElementById('ts-input').value;

    window.electronAPI.saveTSasJS(tsCode).then(msg => {
        alert(msg);
    }).catch(err => {
        alert("保存失敗: " + err);
    });
});

function obfuscateStep() {
    tsCount = parseInt(document.getElementById('ts-count').value, 10) || 1;
    current = 0;
    IsObfuscate = true;
    ultraUniqueProgress = 0;
    ultraUniqueProgressText.innerText = "0%";
    ultraUniqueProgressFill.style.width = ultraUniqueProgress + '%';
    ultraUniqueLoadingScreenEl.classList.remove("loaded");
    const ultraUniqueProgressInterval = setInterval(() => {
        if(IsObfuscate === true){
            setInterval(() => {
                ultraUniqueRandomSpeed = Math.floor(Math.random() * 2);
            }, 200 * tsCount * tsCount);
        } else {
            ultraUniqueRandomSpeed = Math.floor(Math.random() * 101 / 5);
        }
            if (ultraUniqueProgress <= 100) {
                ultraUniqueProgressText.innerHTML = `${ultraUniqueProgress}%`; 
            }

            if (ultraUniqueProgress >= 40 && ultraUniqueCooldown > 0) {
                ultraUniqueCooldown -= 1;
            } else if (ultraUniqueProgress >= 100 || current >= tsCount) {
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
    window.electronAPI.obfuscateTS(currentCode).then(async result => {
        currentCode = result;
        step++;
        tsOutput.textContent = `難読化 ${step}/${tsCount} 回目...`;
        tsOutput.textContent = `難読化中... (${current}/${tsCount})`;
        result = await window.electronAPI.obfuscateTS(result);
        current++;

        if (current < tsCount) {
            if(tsCount > 20){
                setTimeout(step, 100000 * tsCount); // 100ms 待って次の難読化を実行
            } else if(tsCount > 7){
                setTimeout(step, 50000 * tsCount); // 100ms 待って次の難読化を実行
            } else {
                setTimeout(step, 5000 * tsCount); // 100ms 待って次の難読化を実行
            }
            if(ultraUniqueProgress >= 100){
                ultraUniqueProgress = 99;
                ultraUniqueProgressText.innerHTML = '100%';
            }
        } else {
            IsObfuscate = false;
            ultraUniqueLoadingScreenEl.classList.add("loaded");
            tsOutput.textContent = result;
        }

        if (step < tsCount) {
            setTimeout(obfuscateStep, 100);
        } else {
            tsOutput.textContent = currentCode;
        }
    }).catch(e => {
        tsOutput.textContent = `エラー: ${e}`;
    });
}