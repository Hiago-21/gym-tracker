let rotinaAtual = null;
let exercicioSelecionado = null;
let chartInstance = null;
let modoGraficoAtual = 'carga';

const getRotinas = () => JSON.parse(localStorage.getItem('gym_routines')) || [];
const setRotinas = (data) => localStorage.setItem('gym_routines', JSON.stringify(data));
const getLogs = () => JSON.parse(localStorage.getItem('gym_logs_v2')) || [];
const setLogs = (data) => localStorage.setItem('gym_logs_v2', JSON.stringify(data));

const getHojeISO = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
};

function renderSidebar() {
    const lista = document.getElementById('listaRotinas');
    lista.innerHTML = '';
    const rotinas = getRotinas();

    rotinas.forEach((rotina, index) => {
        const li = document.createElement('li');
        li.className = `routine-item ${rotinaAtual === index ? 'active' : ''}`;
        li.innerHTML = `
            <span onclick="abrirRotina(${index})" style="flex:1;">${rotina.nome}</span>
            <div class="routine-actions">
                <button class="icon-btn" onclick="editarRotina(${index})" title="Editar Nome"><i class="fas fa-pen"></i></button>
                <button class="icon-btn danger" onclick="deletarRotina(${index})" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function criarRotina() {
    const nome = prompt("Nome do Treino (Ex: Push):");
    if (!nome) return;
    const rotinas = getRotinas();
    rotinas.push({ nome: nome, exercicios: [] });
    setRotinas(rotinas);
    renderSidebar();
    abrirRotina(rotinas.length - 1);
}

function editarRotina(index) {
    const rotinas = getRotinas();
    const novoNome = prompt("Novo nome:", rotinas[index].nome);
    if(novoNome) { 
        rotinas[index].nome = novoNome; 
        setRotinas(rotinas); 
        renderSidebar(); 
        if(rotinaAtual === index) abrirRotina(index); 
    }
}

function deletarRotina(index) {
    if(!confirm("Excluir este treino permanentemente?")) return;
    const rotinas = getRotinas(); 
    rotinas.splice(index, 1); 
    setRotinas(rotinas); 
    rotinaAtual = null; 
    renderSidebar();
    document.getElementById('mainContent').innerHTML = `<div class="empty-state"><h2>Treino Excluído</h2></div>`;
}

function backupData() {
    const data = { routines: getRotinas(), logs: getLogs() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const date = new Date().toISOString().split('T')[0];
    downloadAnchorNode.setAttribute("download", `gym_backup_${date}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.routines && data.logs) {
                setRotinas(data.routines);
                setLogs(data.logs);
                alert("Dados restaurados com sucesso! A página será recarregada.");
                location.reload();
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch (error) {
            alert("Erro ao ler o arquivo. Certifique-se de que é um JSON válido.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function abrirRotina(index) {
    rotinaAtual = index;
    renderSidebar();
    const rotina = getRotinas()[index];
    const logs = getLogs();

    let html = `
        <div class="header-content">
            <div>
                <p style="color: var(--primary); font-weight: bold; font-size: 0.9rem;">PLANEJAMENTO</p>
                <h2>${rotina.nome}</h2>
            </div>
        </div>
        <div class="exercise-grid">
    `;

    rotina.exercicios.forEach((exNome, exIdx) => {
        const logsExercicio = logs.filter(l => l.exercicio === exNome);
        const ultimoLog = logsExercicio[logsExercicio.length - 1];
        let resumo = "Sem registros";
        let badge = "";

        if (ultimoLog && ultimoLog.sets.length > 0) {
            const maxAtual = Math.max(...ultimoLog.sets.map(s => Number(s.peso)));
            const dataStr = ultimoLog.data.split('-').reverse().join('/');
            resumo = `Carga Max: <strong>${maxAtual}kg</strong> • ${ultimoLog.sets.length} séries <span class="log-date">Dia: ${dataStr}</span>`;
            
            if (logsExercicio.length >= 2) {
                const penultimoLog = logsExercicio[logsExercicio.length - 2];
                const maxAnterior = Math.max(...penultimoLog.sets.map(s => Number(s.peso)));
                const diff = maxAtual - maxAnterior;
                
                if(diff > 0) badge = `<span class="badge up">+${diff}kg</span>`;
                else if(diff < 0) badge = `<span class="badge down">${diff}kg</span>`;
                else badge = `<span class="badge neutral">=</span>`;
            }
        }

        html += `
            <div class="exercise-card" onclick="abrirModalExercicio('${exNome}')">
                <button class="btn-delete-exercise" onclick="removerExercicio(event, ${exIdx})" title="Remover Exercício"><i class="fas fa-times"></i></button>
                <h3>${exNome} ${badge}</h3>
                <div class="last-log">${resumo}</div>
            </div>
        `;
    });

    html += `
        <div class="exercise-card add-exercise-card" onclick="adicionarExercicio()">
            <i class="fas fa-plus" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
            <span>Adicionar Exercício</span>
        </div>
        </div>
    `;
    document.getElementById('mainContent').innerHTML = html;
}

function adicionarExercicio() {
    if (rotinaAtual === null) return;
    const nome = prompt("Nome do Exercício:");
    if (!nome) return;
    const rotinas = getRotinas();
    rotinas[rotinaAtual].exercicios.push(nome);
    setRotinas(rotinas);
    abrirRotina(rotinaAtual);
}

function removerExercicio(event, exIndex) {
    event.stopPropagation();
    if(!confirm("Remover este exercício?")) return;
    const rotinas = getRotinas();
    rotinas[rotinaAtual].exercicios.splice(exIndex, 1);
    setRotinas(rotinas);
    abrirRotina(rotinaAtual);
}

function abrirModalExercicio(nome) {
    exercicioSelecionado = nome;
    document.getElementById('modalTitle').innerText = nome;
    document.getElementById('modalExercicio').style.display = 'flex';
    document.getElementById('inputData').value = getHojeISO();
    document.getElementById('setsContainer').innerHTML = '';
    adicionarSerieVazia();
    renderizarGrafico(nome);
}

function adicionarSerieDOM(peso = '', reps = '') {
    const container = document.getElementById('setsContainer');
    const numSeries = container.children.length + 1;
    
    const div = document.createElement('div');
    div.className = 'set-row';
    div.innerHTML = `
        <span class="set-number">${numSeries}</span>
        <div class="input-group">
            <i class="fas fa-weight-hanging input-icon"></i>
            <input type="number" class="set-peso" placeholder="0" value="${peso}">
        </div>
        <div class="input-group">
            <i class="fas fa-redo-alt input-icon"></i>
            <input type="number" class="set-reps" placeholder="0" value="${reps}">
        </div>
        <div class="set-actions">
            <button class="btn-set-action" onclick="duplicarSerie(this)" title="Duplicar"><i class="fas fa-copy"></i></button>
            <button class="btn-set-action delete" onclick="removerSerieDOM(this)" title="Remover"><i class="fas fa-times"></i></button>
        </div>
    `;
    container.appendChild(div);
    atualizarNumerosSeries();
}

function adicionarSerieVazia() {
    adicionarSerieDOM('', '');
}

function duplicarSerie(btn) {
    const row = btn.closest('.set-row');
    const peso = row.querySelector('.set-peso').value;
    const reps = row.querySelector('.set-reps').value;
    adicionarSerieDOM(peso, reps);
}

function removerSerieDOM(btn) {
    const container = document.getElementById('setsContainer');
    if (container.children.length === 1) {
        alert("Você precisa de pelo menos uma série.");
        return;
    }
    btn.closest('.set-row').remove();
    atualizarNumerosSeries();
}

function atualizarNumerosSeries() {
    const rows = document.querySelectorAll('#setsContainer .set-row');
    rows.forEach((row, index) => {
        row.querySelector('.set-number').innerText = index + 1;
    });
}

function salvarLog() {
    const dataTreino = document.getElementById('inputData').value;
    if (!dataTreino) return alert("Selecione a data do treino.");

    const setRows = document.querySelectorAll('#setsContainer .set-row');
    const sets = [];
    
    setRows.forEach(row => {
        const peso = row.querySelector('.set-peso').value;
        const reps = row.querySelector('.set-reps').value;
        if (peso && reps) {
            sets.push({ peso: Number(peso), reps: Number(reps) });
        }
    });

    if (sets.length === 0) return alert("Preencha o peso e as repetições de pelo menos uma série.");

    let logs = getLogs();
    const indexExistente = logs.findIndex(l => l.exercicio === exercicioSelecionado && l.data === dataTreino);
    const novoLog = { data: dataTreino, exercicio: exercicioSelecionado, sets: sets };

    if (indexExistente >= 0) {
        logs[indexExistente] = novoLog;
    } else {
        logs.push(novoLog);
    }
    
    logs.sort((a, b) => new Date(a.data) - new Date(b.data));
    setLogs(logs);
    
    alert("Treino salvo com sucesso!");
    renderizarGrafico(exercicioSelecionado);
    abrirRotina(rotinaAtual); 
}

function limparHistorico() {
    if(!confirm(`Apagar todo o histórico de "${exercicioSelecionado}"?`)) return;
    let logs = getLogs();
    logs = logs.filter(l => l.exercicio !== exercicioSelecionado);
    setLogs(logs);
    renderizarGrafico(exercicioSelecionado);
    abrirRotina(rotinaAtual);
    alert("Histórico apagado.");
}

function alternarModoGrafico() {
    // Alterna o modo
    modoGraficoAtual = modoGraficoAtual === 'carga' ? 'volume' : 'carga';
    
    // Muda o texto do botão
    const btn = document.getElementById('btnToggleChart');
    if (modoGraficoAtual === 'carga') {
        btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Ver Volume Total';
    } else {
        btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Ver Carga Máxima';
    }

    renderizarGrafico(exercicioSelecionado);
}

function renderizarGrafico(nome) {
    const ctx = document.getElementById('graficoEvolucao').getContext('2d');
    const dados = getLogs().filter(l => l.exercicio === nome);
    const labels = dados.map(d => d.data.split('-').reverse().slice(0, 2).join('/'));

    let valoresParaOGrafico = [];
    let tituloDoGrafico = '';

    const tituloElemento = document.getElementById('tituloGrafico');

    // Verifica qual modo o usuário quer ver
    if (modoGraficoAtual === 'carga') {
        // Pega apenas a maior carga do dia
        valoresParaOGrafico = dados.map(d => Math.max(...d.sets.map(s => s.peso)));
        tituloDoGrafico = 'Carga Máx (kg)';
        tituloElemento.innerText = `Progressão de Carga: ${nome}`;
    } else {
        // Cálculo de Volume: Soma de (Peso * Repetições) de todas as séries
        valoresParaOGrafico = dados.map(d => {
            return d.sets.reduce((totalDaSessao, serie) => {
                return totalDaSessao + (serie.peso * serie.reps);
            }, 0);
        });
        tituloDoGrafico = 'Volume Total (kg)';
        tituloElemento.innerText = `Progressão de Volume: ${nome}`;
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: tituloDoGrafico, 
                data: valoresParaOGrafico,
                borderColor: '#8257e5',
                backgroundColor: 'rgba(130, 87, 229, 0.2)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { grid: { color: '#323238' }, ticks: { color: '#a8a8b3' } },
                x: { grid: { display: false }, ticks: { color: '#a8a8b3' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function fecharModal() {
    document.getElementById('modalExercicio').style.display = 'none';
}

// Inicializa a aplicação carregando a barra lateral
renderSidebar();

// Verifica se o navegador suporta Service Workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registro) => {
        console.log('Service Worker registrado com sucesso:', registro);
      })
      .catch((erro) => {
        console.log('Falha ao registrar o Service Worker:', erro);
      });
  });
}