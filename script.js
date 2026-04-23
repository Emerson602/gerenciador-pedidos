//mongodb+srv://admin:0MizazU0MYQQKSFy@pedidos.t5lnil0.mongodb.net/?appName=pedidos
const API = "https://api-pedidos-dlw2.onrender.com/";
const socket = io(API);

let pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];
let chart;

// 🔄 tempo real
socket.on("pedidosAtualizados", () => {
  console.log("🔄 Atualização em tempo real");
  carregarPedidosDoBanco();
});

// 📥 carrega do banco
async function carregarPedidosDoBanco() {
  try {
    const res = await axios.get(API + "/pedidos");
    pedidos = res.data;

    salvarLocal(); // opcional (cache)
    render();

    console.log("📥 Dados carregados do banco");
  } catch (err) {
    console.error("❌ Erro ao carregar pedidos:", err);
  }
}

// 🔥 chama ao iniciar
carregarPedidosDoBanco();

// 📤 sincroniza com backend
async function sincronizarComAPI() {
  try {
    await fetch(API + "/pedidos/sync", { // ✅ corrigido aqui
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pedidos)
    });

    console.log("✅ Sincronizado com banco");
  } catch (err) {
    console.error("❌ Erro ao sincronizar", err);
  }
}

// 💾 cache local (opcional)
function salvarLocal() {
  localStorage.setItem("pedidos", JSON.stringify(pedidos));
}

function dataHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

function horaAgora() {
  const agora = new Date();
  return agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  ultimos.forEach(p => {
    const preparo = calcularMinutos(p.recebido, p.pronto);
    const entregadorTempo = calcularMinutos(p.chamei, p.saiu);
    const caixa = calcularMinutos(p.pronto, p.chamei);

    if (preparo !== null) preparoArr.push(preparo);
    if (caixa !== null) caixaArr.push(caixa);

    // 👇 separa por entregador
    if (entregadorTempo !== null && p.entregador) {
      if (!entregadores[p.entregador]) {
        entregadores[p.entregador] = [];
      }
      entregadores[p.entregador].push(entregadorTempo);
    }
  });

  const labels = ultimos.map(p => p.pedido);

  if (chart) chart.destroy();

  const ctx = document.getElementById("grafico");

  const datasets = [
  {
    label: "Preparo",
    data: preparoArr,
    backgroundColor: "#B0C4DE",
    borderColor: "#B0C4DE",
    borderWidth: 1
  },
  {
    label: "Caixa",
    data: caixaArr,
    backgroundColor: "#556B2F",
    borderColor: "#556B2F",
    borderWidth: 1
  }
  ];

  // 👇 cria uma linha para cada entregador
    Object.keys(entregadores).forEach(nome => {
    const cor = `hsl(${Math.random() * 360}, 70%, 50%)`;

    datasets.push({
        label: `Entregador - ${nome}`,
        data: entregadores[nome],
        borderColor: cor,
        backgroundColor: cor,
        borderWidth: 2
    });
    });

chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels,
    datasets
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top"
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

  // 📊 médias
  const media = arr => arr.length
    ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
    : 0;

  let html = `
    ⏱️ Tempo médio cozinha: ${media(preparoArr)} min<br>
    💬 Tempo médio Caixa: ${media(caixaArr)} min<br>
  `;

  // 👇 média por entregador
  Object.keys(entregadores).forEach(nome => {
    html += `🛵Tempo médio ${nome}: ${media(entregadores[nome])} min<br>`;
  });

  document.getElementById("medias").innerHTML = html;
}

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

// ao carregar
window.onload = () => {
  const painel = document.getElementById("painelControle");
  const btn = document.getElementById("btnPainel");

  const escondido = localStorage.getItem("painelHidden") === "true";

  if (escondido) {
    painel.classList.add("hidden");
    btn.innerText = "⚙️ Mostrar Painel";
  }
};

function togglePainel() {
  const painel = document.getElementById("painelControle");
  const btn = document.getElementById("btnPainel");

  painel.classList.toggle("hidden");

  if (painel.classList.contains("hidden")) {
    btn.innerText = "⚙️ Mostrar Painel";
  } else {
    btn.innerText = "⚙️ Esconder Painel";
  }
}

// TABELA
function render() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  [...pedidos].reverse().forEach((p, indexOriginal) => {
    const index = pedidos.length - 1 - indexOriginal;

    const preparo = calcularMinutos(p.recebido, p.pronto);
    const entregador = calcularMinutos(p.chamei, p.saiu);
    const caixa = calcularMinutos(p.pronto, p.chamei);

    lista.innerHTML += `
      <div class="bg-white shadow rounded-xl p-4 flex flex-col gap-2">

        <!-- TOPO -->
        <div class="flex justify-between items-center">
          <span class="font-bold">Pedido ${p.pedido}</span>
          <span class="text-gray-500 text-sm">${p.data || '-'}</span>
        </div>

        <!-- TEMPOS -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div class="${preparo >= 15 ? 'text-red-500 font-bold' : ''}">
            <strong>Tempo de preparo:</strong> ${formatarTempo(preparo)}
          </div>

          <div class="${entregador >= 10 ? 'text-red-500 font-bold' : ''}">
            <strong>Tempo de saida motoboy:</strong> ${formatarTempo(entregador)}
          </div>

          <div class="${caixa >= 10 ? 'text-red-500 font-bold' : ''}">
            <strong>Tempo de preparo caixa:</strong> ${formatarTempo(caixa)}
          </div>
        </div>

        <!-- STATUS -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div onclick="editar(${index}, 'recebido')" class="cursor-pointer">
            <strong>Pedido recebido:</strong> ${p.recebido || '-'}
          </div>

          <div onclick="editar(${index}, 'pronto')" class="cursor-pointer">
            <strong>Pedido ficou pronto:</strong> ${p.pronto || '-'}
          </div>

          <div onclick="editar(${index}, 'chamei')" class="cursor-pointer">
            <strong>Chamei motoboy:</strong> ${p.chamei || '-'}
          </div>

          <div onclick="editar(${index}, 'saiu')" class="cursor-pointer">
            <strong>Saiu para entrega:</strong> ${p.saiu || '-'}
          </div>
        </div>

        <!-- ENTREGADOR -->
        <div onclick="editar(${index}, 'entregador')" class="cursor-pointer text-sm">
          <strong>Motoboy:</strong> ${p.entregador || '-'}
        </div>

        <!-- OBS -->
        <div onclick="editar(${index}, 'observacao')" class="cursor-pointer text-sm">
          <strong>Obs:</strong> ${p.observacao || '-'}
        </div>

        <!-- AÇÕES -->
        <div class="flex gap-2 mt-2">
          <button onclick="remover(${index})"
            class="bg-red-500 text-white px-2 py-1 rounded">
            Excluir
          </button>
        </div>

      </div>
    `;
  });
}

// FUNÇÕES
function criarPedido() {
  const pedido = document.getElementById("pedido").value;
  const observacao = document.getElementById("observacao").value;

  pedidos.push({ 
    pedido, 
    data: dataHoje(),
    observacao 
  });

  salvarLocal();
  render();
  sincronizarComAPI()
}

function acao(tipo) {
  const pedido = document.getElementById("pedido").value;
  const valor = horaAgora();

  const p = pedidos.find(p => p.pedido === pedido);

  if (p) {
    if (p[tipo]) return;

    p[tipo] = valor;
    salvarLocal();
    sincronizarComAPI()
    render();
  }
}

function setEntregador() {
  const pedido = document.getElementById("pedido").value;
  const entregador = document.getElementById("entregador").value;

  const p = pedidos.find(p => p.pedido === pedido);
  if (!p) return;

  p.entregador = entregador;

  salvarLocal();
  sincronizarComAPI(); // 🔥 adicionar isso
  render();
}

async function editar(index, campo) {
  const novo = prompt("Editar:", pedidos[index][campo] || "");
  if (novo === null) return;

  const pedido = pedidos[index];

  // ⚠️ garante que tem ID do Mongo
  if (!pedido._id) {
    console.warn("Pedido sem _id, não pode atualizar no banco");
    return;
  }

  try {
    // atualiza no backend
    const res = await fetch(API + "/pedidos/" + pedido._id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...pedido,
        [campo]: novo
      })
    });

    const atualizado = await res.json();

    // atualiza local com retorno do banco
    pedidos[index] = atualizado;

    salvarLocal();
    render();

    console.log("✏️ Pedido atualizado");
  } catch (err) {
    console.error("❌ Erro ao editar:", err);
  }
}

async function remover(index) {
  const pedido = pedidos[index];

  try {
    // 🔥 deleta no backend
    await fetch(API + "/pedidos/" + pedido._id, {
      method: "DELETE"
    });

    // remove local
    pedidos.splice(index, 1);

    salvarLocal();
    render();

    console.log("🗑️ Pedido removido");
  } catch (err) {
    console.error("❌ Erro ao deletar:", err);
  }
}

function calcularMinutos(inicio, fim) {
  if (!inicio || !fim) return null;

  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);

  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function formatarTempo(min) {
  return min === null ? "-" : `${min} min`;
}

render();

setInterval(() => {
  setEntregador()
}, 5000);


setInterval(() => {
   sincronizarComAPI();
}, 300000); 

document.getElementById("entregador").addEventListener("change", setEntregador);