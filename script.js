const API = "https://api-pedidos-dlw2.onrender.com";

let pedidos = [];
let chart;

// 🔄 atualização automática (2 min)
function atualizarPeriodicamente() {
  carregarPedidosDoBanco();
  setTimeout(atualizarPeriodicamente, 120000); 
}

atualizarPeriodicamente();

// 📥 carregar pedidos
async function carregarPedidosDoBanco() {
  try {
    const res = await axios.get(API + "/pedidos");
    pedidos = res.data;
    render();
  } catch (err) {
    console.error("❌ Erro ao carregar pedidos:", err);
  }
}

// iniciar
carregarPedidosDoBanco();

function dataHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

function horaAgora() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// MODAL
function abrirModal() {
  document.getElementById("modal").classList.remove("hidden");
  gerarGrafico();
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

// GRÁFICO
function gerarGrafico() {
  const ultimos = [...pedidos].slice(-100);

  const preparoArr = [];
  const caixaArr = [];
  const entregadores = {};

  const labels = ultimos.map(p => p.pedido);

  // 🎨 cores fixas
  const coresEntregadores = {
    Miqueias: "#c52222",
    Ivan: "#0614d4",
    Bruno: "#18963e",
    Lucas: "#7b33be",
    Gustavo: "#e9ef48",
    Extra: "#2d6872",
    Ifood: "#a3d0c3"
  };

  ultimos.forEach((p, i) => {
    const preparo = calcularMinutos(p.recebido, p.pronto);
    const entregadorTempo = calcularMinutos(p.chamei, p.saiu);
    const caixa = calcularMinutos(p.pronto, p.chamei);

    preparoArr[i] = preparo ?? null;
    caixaArr[i] = caixa ?? null;

    // ✅ CADA PEDIDO CONTA (sem agrupamento)
    if (p.entregador) {
      if (!entregadores[p.entregador]) {
        entregadores[p.entregador] = [];
      }

      if (entregadorTempo !== null) {
        entregadores[p.entregador].push(entregadorTempo);
      }
    }
  });

  if (chart) chart.destroy();

  const ctx = document.getElementById("grafico");

  const datasets = [
    {
      label: "Cozinha",
      data: preparoArr,
      backgroundColor: "#d32a8f"
    },
    {
      label: "Caixa",
      data: caixaArr,
      backgroundColor: "#252425"
    }
  ];

  // 🔥 manter posição correta no gráfico
  Object.keys(entregadores).forEach(nome => {
    const cor = coresEntregadores[nome] || "#000";

    const dados = new Array(ultimos.length).fill(null);

    ultimos.forEach((p, i) => {
      if (p.entregador === nome) {
        const tempo = calcularMinutos(p.chamei, p.saiu);
        if (tempo !== null) {
          dados[i] = tempo;
        }
      }
    });

    datasets.push({
      label: `${nome}`,
      data: dados,
      backgroundColor: cor,
      borderColor: cor
    });
  });

  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // 📊 MÉDIAS + CONTAGEM
  const media = arr =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

  const totalValidos = arr => arr.filter(v => v !== null).length;

  function corMedia(valor, limite) {
    if (valor === null || valor === undefined || isNaN(valor)) return '-';

    return valor >= limite
      ? `<span class="text-red-800 font-bold">${valor}</span>`
      : `<span class="text-green-800 font-bold">${valor}</span>`;
  }

  let html = `
    ⏱️ Tempo médio (Cozinha): ${corMedia(media(preparoArr), 15)} min 
    <span>| ${totalValidos(preparoArr)} pedidos</span><br>

    💬 Tempo médio (Caixa): ${corMedia(media(caixaArr), 10)} min 
    <span>| ${totalValidos(caixaArr)} pedidos</span><br>
  `;

  // 🔥 MÉDIA POR PEDIDO (cada pedido = 1 corrida)
  Object.keys(entregadores).forEach(nome => {
    const tempos = entregadores[nome];

    const mediaFinal = tempos.length
      ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1)
      : 0;

    const totalCorridas = tempos.length;

    const totalPedidos = ultimos.filter(p => p.entregador === nome).length;

    html += `🛵 Tempo médio (${nome}): ${corMedia(mediaFinal, 10)} min 
    <span>| ${totalCorridas} pedidos</span><br>`;
  });

  document.getElementById("medias").innerHTML = html;
}

// PAINEL
function togglePainel() {
  const painel = document.getElementById("painelControle");
  const btn = document.getElementById("btnPainel");

  painel.classList.toggle("hidden");

  const escondido = painel.classList.contains("hidden");
  localStorage.setItem("painelHidden", escondido);

  btn.innerText = escondido
    ? "⚙️ Mostrar Painel"
    : "⚙️ Esconder Painel";
}

async function editarCampo(index, campo) {
  const p = pedidos[index];
  if (!p) return;

  const novo = prompt(`Editar ${campo}:`, p[campo] || "");

  if (novo === null) return;

  try {
    const res = await fetch(API + "/pedidos/" + p._id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...p,
        [campo]: novo
      })
    });

    const atualizado = await res.json();

    pedidos[index] = atualizado;

    render();

  } catch (err) {
    console.error("Erro ao editar:", err);
  }
}

window.onload = () => {
  const escondido = localStorage.getItem("painelHidden") === "true";
  if (escondido) {
    document.getElementById("painelControle").classList.add("hidden");
  }
};

// TABELA
function render() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  [...pedidos].forEach((p, indexOriginal) => {
    const index = pedidos.length - 1 - indexOriginal;

      const tempoPreparo = calcularMinutos(p.recebido, p.pronto);
      const tempoCaixa = calcularMinutos(p.pronto, p.chamei);
      const tempoEntrega = calcularMinutos(p.chamei, p.saiu);

    lista.innerHTML += `
      <div class="bg-white p-4 rounded-xl shadow">

        <div class="flex justify-between">
          <b>Pedido: ${p.pedido}</b>
          <span>${p.data || "-"}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">

          <div class="relative group m-2">
            <div class="text-base">
              ⏱️ Preparo (cozinha): <strong class="${tempoPreparo >= 15 ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}">${tempoPreparo !== null ? tempoPreparo + ' min' : '-'}</strong>
            </div>

            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 
                        transition duration-200 bg-black text-white text-xs px-2 py-1 rounded 
                        max-w-[90vw] text-center break-words">
              Tempo que o pedido levou para ficar pronto
            </div>
          </div>

          <div class="relative group m-2">
            <div class="text-base">
              💬 Organização (caixa):<strong class="${tempoCaixa >= 10 ? 'text-red-500 font-bold' : 'text-green-500'}"> ${tempoCaixa !== null ? tempoCaixa + ' min' : '-'} </strong>
            </div>

            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 
                        transition duration-200 bg-black text-white text-xs px-2 py-1 rounded 
                        max-w-[90vw] text-center break-words">
              Tempo que o caixa levou para organizar os pedidos e chamar o motoboy
            </div>
          </div>

          <div class="relative group m-2">
            <div class="text-base">
              🛵 Saida (motoboy): <strong class="${tempoEntrega >= 10 ? 'text-red-500 font-bold' : 'text-green-500'}">${tempoEntrega !== null ? tempoEntrega + ' min' : '-'}</strong>
            </div>

            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 
                        transition duration-200 bg-black text-white text-xs px-2 py-1 rounded 
                        max-w-[90vw] text-center break-words">
              Tempo que o motoboy levou para sair, a partir do momento em que foi chamado pelo caixa
            </div>
          </div>

      </div>

      <div class="flex flex-row flex-wrap">
        <div onclick="editarCampo(${index}, 'recebido')" class="m-2 cursor-pointer">
          <strong>Pedido recebido:</strong> ${p.recebido || '-'}
        </div>

        <div onclick="editarCampo(${index}, 'pronto')" class="m-2 cursor-pointer">
          <strong>Pedido pronto:</strong> ${p.pronto || '-'}
        </div>

        <div onclick="editarCampo(${index}, 'chamei')" class="m-2 cursor-pointer">
          <strong>Chamei motoboy:</strong> ${p.chamei || '-'}
        </div>

        <div onclick="editarCampo(${index}, 'saiu')" class="m-2 cursor-pointer">
          <strong>Saiu para entrega:</strong> ${p.saiu || '-'}
        </div>
      </div>
        <div class="m-2">
          <strong>Motoboy:</strong> ${p.entregador || '-'}
        </div>

        <div onclick="editarCampo(${index}, 'observacao')" class="m-2 cursor-pointer">
          <strong>Observação:</strong> ${p.observacao || '-'}
        </div>

        <div class="flex flex-row flex-wrap gap-2 mt-2">
        <button onclick="acao(${index}, 'recebido')" class="rounded-lg bg-yellow-500 text-white p-2">Pedido recebido</button>
        <button onclick="acao(${index}, 'pronto')" class="rounded-lg bg-green-500 text-white p-2">Pedido ficou pronto</button>
        <button onclick="acao(${index}, 'chamei')" class="rounded-lg bg-orange-500 text-white p-2">Chamei entregador</button>
        <button onclick="acao(${index}, 'saiu')" class="rounded-lg bg-red-500 text-white p-2">Saiu para entrega</button>

        <select class="border-2 border-black rounded-lg p-2" onchange="setEntregador(${index}, this.value)">
          <option value=""></option>
          <option ${p.entregador === 'Miqueias' ? 'selected' : ''}>Miqueias</option>
          <option ${p.entregador === 'Ivan' ? 'selected' : ''}>Ivan</option>
          <option ${p.entregador === 'Bruno' ? 'selected' : ''}>Bruno</option>
          <option ${p.entregador === 'Lucas' ? 'selected' : ''}>Lucas</option>
          <option ${p.entregador === 'Gustavo' ? 'selected' : ''}>Gustavo</option>
          <option ${p.entregador === 'Extra' ? 'selected' : ''}>Extra</option>
          <option ${p.entregador === 'Ifood' ? 'selected' : ''}>Ifood</option>
        </select>

          
        </div>

        <button onclick="remover(${index})" class="rounded-lg bg-red-600 text-white mt-2 p-2">Excluir</button>

      </div>
    `;
  });
}

// CRIAR
async function criarPedido() {
  const pedido = document.getElementById("pedido").value;

  if (!pedido) return alert("Digite o pedido");

  await fetch(API + "/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pedido,
      data: dataHoje()
    })
  });

  document.getElementById("pedido").value = "";
  carregarPedidosDoBanco();
}

// AÇÃO
async function acao(index, tipo) {
  const p = pedidos[index];
  if (!p) return;

  const hora = horaAgora();

  try {
    const res = await fetch(API + "/pedidos/" + p._id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...p,
        [tipo]: hora
      })
    });

    const atualizado = await res.json();

    pedidos[index] = atualizado;

    render();

  } catch (err) {
    console.error("Erro na ação:", err);
  }
}
// ENTREGADOR
async function setEntregador(index, entregador) {
  const p = pedidos[index];
  if (!p) return;

  try {
    const res = await fetch(API + "/pedidos/" + p._id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...p,
        entregador
      })
    });

    const atualizado = await res.json();

    pedidos[index] = atualizado;

    render();

  } catch (err) {
    console.error("Erro ao salvar entregador:", err);
  }
}

// REMOVER
async function remover(index) {
  const p = pedidos[index];

  await fetch(API + "/pedidos/" + p._id, {
    method: "DELETE"
  });

  carregarPedidosDoBanco();
}

function calcularMinutos(i, f) {
  if (!i || !f) return null;
  const [h1, m1] = i.split(":").map(Number);
  const [h2, m2] = f.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

function formatarTempo(m) {
  return m == null ? "-" : m + " min";
}