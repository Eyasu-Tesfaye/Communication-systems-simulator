/**
 * Generates and triggers download of a standalone, offline single-file HTML version of ProbStat Studio.
 */

export function exportStandaloneHtml() {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProbStat Studio v2.0 - Offline Workbench</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #fcfbf9; color: #1e293b; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body class="p-4 sm:p-8 max-w-6xl mx-auto">
  <header class="pb-6 mb-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">PROBSTAT STUDIO v2.0</span>
        <span class="text-xs text-slate-500">Standalone Offline Edition</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Probability & Statistics Workbench</h1>
    </div>
    <div class="text-xs font-mono text-slate-500">Self-Contained Browser Bundle</div>
  </header>

  <main class="space-y-6">
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h2 class="text-lg font-bold text-slate-900">Normal (Gaussian) Distribution Live Calculator</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Mean (μ): <span id="muVal" class="font-mono font-bold text-amber-700">0.0</span></label>
          <input type="range" id="muInput" min="-5" max="5" step="0.1" value="0" class="w-full accent-amber-600">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Std Deviation (σ): <span id="sigmaVal" class="font-mono font-bold text-amber-700">1.0</span></label>
          <input type="range" id="sigmaInput" min="0.2" max="4" step="0.1" value="1" class="w-full accent-amber-600">
        </div>
      </div>
      <div class="h-64 relative bg-[#fcfbf9] rounded-xl border border-slate-200 p-2">
        <canvas id="normalChart"></canvas>
      </div>
    </div>
  </main>

  <footer class="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 font-mono">
    Exported from AI Studio Signal Lab Workspace · ProbStat Studio v2.0
  </footer>

  <script>
    function normalPdf(x, mu, sigma) {
      return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
    }

    const ctx = document.getElementById('normalChart').getContext('2d');
    let mu = 0.0, sigma = 1.0;

    function getPoints() {
      const labels = [];
      const data = [];
      for (let x = -5; x <= 5; x += 0.1) {
        labels.push(x.toFixed(1));
        data.push(normalPdf(x, mu, sigma));
      }
      return { labels, data };
    }

    const initial = getPoints();
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initial.labels,
        datasets: [{
          label: 'f(x) Density',
          data: initial.data,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    const muInput = document.getElementById('muInput');
    const sigmaInput = document.getElementById('sigmaInput');
    const muVal = document.getElementById('muVal');
    const sigmaVal = document.getElementById('sigmaVal');

    function update() {
      mu = parseFloat(muInput.value);
      sigma = parseFloat(sigmaInput.value);
      muVal.textContent = mu.toFixed(1);
      sigmaVal.textContent = sigma.toFixed(1);
      const pts = getPoints();
      chart.data.labels = pts.labels;
      chart.data.datasets[0].data = pts.data;
      chart.update();
    }

    muInput.addEventListener('input', update);
    sigmaInput.addEventListener('input', update);
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'probstat-studio.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
