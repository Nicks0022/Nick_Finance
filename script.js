let expensesChart = null;
const API_URL = "http://127.0.0.1:8000";

// Inicialização automática ao abrir o sistema
document.addEventListener("DOMContentLoaded", () => {
    carregarDados();
    configurarNavegacaoSPA();
    configurarModais();
    configurarFormularios();
});

// 1. CARREGAR E RECALCULAR TODOS OS DADOS DA API
async function carregarDados() {
    try {
        // Requisição paralela das tabelas do banco
        const [resTrans, resMetas] = await Promise.all([
            fetch(`${API_URL}/transacoes/`),
            fetch(`${API_URL}/metas/`)
        ]);

        const transacoes = resTrans.ok ? await resTrans.json() : [];
        const metas = resMetas.ok ? await resMetas.json() : [];

        renderizarFinanceiro(transacoes);
        renderizarMetas(metas);
    } catch (err) {
        console.error("Erro na comunicação com a API Back-end:", err);
    }
}

// 2. PROCESSAR E RENDERIZAR TRANSAÇÕES, SALDO E GRÁFICO
function renderizarFinanceiro(transacoes) {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalTransporte = 0;

    // Mapeamento para agrupar categorias no gráfico de despesa
    const categoriasFiltro = { food: 0, transport: 0, beauty: 0, apparel: 0, education: 0, leisure: 0, others: 0 };

    const tbody = document.getElementById("tabela-transacoes-body");
    tbody.innerHTML = "";

    if (transacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-folder-open" style="font-size: 40px; margin-bottom: 15px; color: #333;"></i><br>Sua lista está vazia.</div></td></tr>`;
    } else {
        // Ordenar da mais nova para a mais antiga no histórico
        transacoes.reverse().forEach(t => {
            const valorNum = parseFloat(t.valor);
            if (t.tipo === "entrada") {
                totalReceitas += valorNum;
            } else {
                totalDespesas += valorNum;
                if (t.categoria === "transport") totalTransporte += valorNum;
                if (categoriasFiltro.hasOwnProperty(t.categoria)) {
                    categoriasFiltro[t.categoria] += valorNum;
                } else {
                    categoriasFiltro.others += valorNum;
                }
            }

            // Montar linha detalhada da tabela
            const tr = document.createElement("tr");
            const dataFormatada = new Date(t.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const sinal = t.tipo === "saida" ? "-" : "+";
            const corValor = t.tipo === "saida" ? "#ff5252" : "#00e676";

            tr.innerHTML = `
                        <td>${dataFormatada}</td>
                        <td style="font-weight:600;">${t.descricao}</td>
                        <td><span style="background:rgba(113,53,255,0.15); color:var(--pink-soft); padding:4px 10px; border-radius:12px; font-size:12px;">${t.categoria.toUpperCase()}</span></td>
                        <td style="text-align:right; color:${corValor}; font-weight:600;">${sinal} R$ ${valorNum.toFixed(2)}</td>
                    `;
            tbody.appendChild(tr);
        });
    }

    // Atualizar os Displays Principais do Dashboard
    const saldoFinal = totalReceitas - totalDespesas;
    document.getElementById("label-saldo").innerText = `R$ ${saldoFinal.toFixed(2)}`;
    document.getElementById("label-receitas").innerText = `R$ ${totalReceitas.toFixed(2)}`;

    const transCard = document.getElementById("dash-transporte");
    transCard.innerText = `R$ ${totalTransporte.toFixed(2)}`;
    if (totalTransporte > 0) transCard.style.color = "#2196f3";

    // Insights dinâmicos baseados no comportamento real
    const dicaElement = document.getElementById("dash-dica");
    if (totalDespesas > 0) {
        dicaElement.style.color = "var(--text-main)";
        dicaElement.innerHTML = `Sua maior saída cadastrada está sendo monitorada. Continue lançando para calibrar o algoritmo de proteção.`;
    }

    // Atualizar Instância do Chart.js
    atualizarGraficoPizza(categoriasFiltro);
}

// 3. ATUALIZAR GRÁFICO DINAMICAMENTE CONFORME VALORES DO BANCO
function atualizarGraficoPizza(dadosCategorias) {
    const ctx = document.getElementById('expensesChart').getContext('2d');

    if (expensesChart) expensesChart.destroy(); // Reseta para evitar sobreposição

    const valores = Object.values(dadosCategorias);
    const temDados = valores.some(v => v > 0);

    expensesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: temDados ? ['Alimentação', 'Transporte', 'Beleza', 'Vestuário', 'Educação', 'Lazer', 'Outros'] : ['Sem despesas'],
            datasets: [{
                data: temDados ? valores : [1],
                backgroundColor: temDados ? ['#ff007f', '#2196f3', '#e91e63', '#00e676', '#ff9800', '#9c27b0', '#7e7e8c'] : ['#222'],
                borderWidth: 2,
                borderColor: '#15132B'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#7e7e8c', font: { family: 'Urbanist', size: 11 }, padding: 10 } },
                tooltip: { enabled: temDados }
            },
            cutout: '75%'
        }
    });
}

// 4. PROCESSAR E EXIBIR METAS NO CARD DE RESUMO E NA GRADE
function renderizarMetas(metas) {
    const dashMetaValor = document.getElementById("dash-meta-valor");
    const dashMetaNome = document.getElementById("dash-meta-nome");
    const gridContainer = document.getElementById("goals-grid-container");

    if (metas.length > 0) {
        const ultimaMeta = metas[metas.length - 1];
        dashMetaValor.innerText = `R$ ${parseFloat(ultimaMeta.valor_alvo).toFixed(2)}`;
        dashMetaNome.innerText = `Alvo: ${ultimaMeta.nome}`;
    } else {
        dashMetaValor.innerText = "R$ 0,00";
        dashMetaNome.innerText = "Nenhuma meta configurada ainda.";
    }

    gridContainer.innerHTML = "";
    if (metas.length === 0) {
        gridContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-ranking-star" style="font-size:40px; margin-bottom:15px; color:#333;"></i><br>Nenhuma meta cadastrada no painel.</div>`;
    } else {
        metas.forEach(m => {
            const card = document.createElement("div");
            card.className = "bento-card col-4 row-1";

            let faIcon = "fa-laptop";
            if (m.icone === "icon-plane") faIcon = "fa-plane-departure";
            if (m.icone === "icon-car") faIcon = "fa-car";
            if (m.icone === "icon-piggy") faIcon = "fa-piggy-bank";

            const dataFormetada = new Date(m.data_limite).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            card.innerHTML = `
                        <div class="card-header-box">
                            <span class="card-title">${m.nome}</span>
                            <div class="card-icon"><i class="fa-solid ${faIcon}"></i></div>
                        </div>
                        <div class="balance-value" style="font-size: 28px;">R$ ${parseFloat(m.valor_alvo).toFixed(2)}</div>
                        <p class="balance-sub">Data Limite: ${dataFormetada}</p>
                    `;
            gridContainer.appendChild(card);
        });
    }
}

// 5. CONFIGURAÇÃO DE SUBMISSÃO DE FORMULÁRIOS (POST REAL)
function configurarFormularios() {
    // Enviar Transação
    document.getElementById("form-transacao").addEventListener("submit", async (e) => {
        e.preventDefault();
        const dados = {
            tipo: document.getElementById("input-tipo").value,
            descricao: document.getElementById("input-descricao").value,
            valor: parseFloat(document.getElementById("input-valor").value),
            categoria: document.getElementById("input-categoria").value
        };

        const res = await fetch(`${API_URL}/transacoes/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            document.getElementById("form-transacao").reset();
            carregarDados(); // Recarrega e redesenha tudo instantaneamente!
        }
    });

    // Enviar Meta
    document.getElementById("form-meta").addEventListener("submit", async (e) => {
        e.preventDefault();
        const dados = {
            nome: document.getElementById("meta-nome").value,
            valor_alvo: parseFloat(document.getElementById("meta-valor").value),
            data_limite: document.getElementById("meta-data").value,
            icone: document.querySelector('input[name="meta_icon"]:checked').value
        };

        const res = await fetch(`${API_URL}/metas/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            document.getElementById("form-meta").reset();
            document.getElementById("modal-nova-meta").classList.remove("active");
            carregarDados(); // Recarrega as metas na tela
        }
    });
}

// 6. CONTROLADORES DOS MODAIS
function configurarModais() {
    const modal = document.getElementById('modal-nova-meta');
    document.getElementById('btn-open-modal').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
}

// 7. CONTROLE DO FLUXO SPA DA INTERFACE
function configurarNavegacaoSPA() {
    const menuItems = document.querySelectorAll('.menu-item');
    const screens = document.querySelectorAll('.screen');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            screens.forEach(screen => screen.classList.remove('active'));

            const targetScreenId = this.getAttribute('data-target');
            document.getElementById(targetScreenId).classList.add('active');

            if (targetScreenId === 'screen-dashboard') {
                headerTitle.innerHTML = 'Olá, <span>Bem-vinda</span>';
                headerSubtitle.innerText = 'Seu dashboard está pronto para ser configurado.';
            } else if (targetScreenId === 'screen-transactions') {
                headerTitle.innerHTML = 'Suas <span>Transações</span>';
                headerSubtitle.innerText = 'Consulte detalhadamente data, categoria e valor.';
            } else if (targetScreenId === 'screen-goals') {
                headerTitle.innerHTML = 'Metas do <span>Mês</span>';
                headerSubtitle.innerText = 'Defina alvos e acompanhe o progresso das suas economias.';
            }
        });
    });
}
