(function () {
  "use strict";

  const STORAGE_KEY = "handfoot-score-state-v1";

  const FIELD_DEFS = [
    { key: "jokers", label: "Jokers melded", value: 50, hint: "50 pts each" },
    { key: "twos", label: "2s melded", value: 20, hint: "20 pts each" },
    { key: "aces", label: "Aces melded", value: 20, hint: "20 pts each" },
    { key: "highCards", label: "8s through Kings melded", value: 10, hint: "10 pts each" },
    { key: "lowCards", label: "4s through 7s melded", value: 5, hint: "5 pts each" },
    { key: "blackThreesPlayed", label: "Black 3s played (going out only)", value: 5, hint: "5 pts each" },
    { key: "blackThreesStuck", label: "Black 3s stuck in hand", value: -5, hint: "-5 pts each" },
    { key: "redThrees", label: "Red 3s melded", value: 0, hint: "100 pts each if your team goes out, else 50 — see toggle below" },
    { key: "redThreesStuck", label: "Red 3s stuck in hand", value: -500, hint: "-500 pts each (common penalty; varies by table)" },
    { key: "naturalCanastas", label: "Natural (clean) canastas", value: 500, hint: "500 pts each" },
    { key: "mixedCanastas", label: "Mixed (dirty) canastas", value: 300, hint: "300 pts each" },
    { key: "leftoverPenalty", label: "Unmelded cards left in hand (point value)", value: -1, hint: "enter the total point value of leftover cards — it will be subtracted" }
  ];

  function defaultTeamState(name) {
    const state = { name, wentOut: false };
    FIELD_DEFS.forEach((f) => (state[f.key] = 0));
    return state;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore corrupt storage */
    }
    return {
      teams: [defaultTeamState("Team 1"), defaultTeamState("Team 2")],
      history: []
    };
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable, continue without persistence */
    }
  }

  function computeTeamTotal(team) {
    let total = 0;
    FIELD_DEFS.forEach((f) => {
      const count = Number(team[f.key]) || 0;
      if (f.key === "redThrees") {
        const perCard = team.wentOut ? 100 : 50;
        total += count * perCard;
      } else if (f.key === "leftoverPenalty") {
        total -= count;
      } else {
        total += count * f.value;
      }
    });
    if (team.wentOut) total += 100;
    return total;
  }

  function renderTeams() {
    const container = document.getElementById("teams");
    container.innerHTML = "";
    state.teams.forEach((team, idx) => {
      const div = document.createElement("div");
      div.className = "team";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = team.name;
      nameInput.addEventListener("input", (e) => {
        state.teams[idx].name = e.target.value;
        saveState();
        renderHistory();
      });
      div.appendChild(nameInput);

      FIELD_DEFS.forEach((f) => {
        const row = document.createElement("div");
        row.className = "field-row";
        const label = document.createElement("label");
        label.innerHTML = f.label + '<span class="hint">' + f.hint + "</span>";
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "1";
        input.setAttribute("inputmode", "numeric");
        input.value = team[f.key];
        // UX: the field defaults to 0; on focus, clear the placeholder 0 and select
        // everything so the first keystroke replaces it (prevents "09"/"90" from a
        // cursor landing beside the existing 0). Restore 0 on blur if left empty.
        input.addEventListener("focus", (e) => {
          if (e.target.value === "0") e.target.value = "";
          e.target.select();
        });
        input.addEventListener("blur", (e) => {
          if (e.target.value.trim() === "") {
            e.target.value = "0";
            state.teams[idx][f.key] = 0;
            saveState();
            updateTotals();
          }
        });
        input.addEventListener("input", (e) => {
          state.teams[idx][f.key] = Number(e.target.value) || 0;
          saveState();
          updateTotals();
        });
        row.appendChild(label);
        row.appendChild(input);
        div.appendChild(row);
      });

      const wentOutRow = document.createElement("div");
      wentOutRow.className = "checkbox-row";
      const wentOutCheckbox = document.createElement("input");
      wentOutCheckbox.type = "checkbox";
      wentOutCheckbox.checked = team.wentOut;
      wentOutCheckbox.id = "wentOut-" + idx;
      wentOutCheckbox.addEventListener("change", (e) => {
        state.teams[idx].wentOut = e.target.checked;
        saveState();
        updateTotals();
      });
      const wentOutLabel = document.createElement("label");
      wentOutLabel.htmlFor = "wentOut-" + idx;
      wentOutLabel.textContent = "This team went out this hand (+100, and red 3s pay full value)";
      wentOutRow.appendChild(wentOutCheckbox);
      wentOutRow.appendChild(wentOutLabel);
      div.appendChild(wentOutRow);

      const totalDiv = document.createElement("div");
      totalDiv.className = "score-total";
      totalDiv.id = "total-" + idx;
      div.appendChild(totalDiv);

      container.appendChild(div);
    });
    updateTotals();
  }

  function updateTotals() {
    state.teams.forEach((team, idx) => {
      const total = computeTeamTotal(team);
      const el = document.getElementById("total-" + idx);
      if (el) el.textContent = team.name + ": " + total + " pts this hand";
    });
  }

  function renderHistory() {
    const heading = document.getElementById("historyHeading");
    const table = document.getElementById("historyTable");
    const headRow = document.getElementById("historyHead");
    const body = document.getElementById("historyBody");
    const grandTotals = document.getElementById("grandTotals");

    if (state.history.length === 0) {
      heading.style.display = "none";
      table.style.display = "none";
      grandTotals.innerHTML = "";
      return;
    }

    heading.style.display = "block";
    table.style.display = "table";

    headRow.innerHTML = "<th>Hand #</th>" + state.teams.map((t) => "<th>" + escapeHtml(t.name) + "</th>").join("");

    body.innerHTML = "";
    const runningTotals = state.teams.map(() => 0);
    state.history.forEach((round, i) => {
      const tr = document.createElement("tr");
      let cells = "<td>" + (i + 1) + "</td>";
      round.scores.forEach((score, idx) => {
        runningTotals[idx] += score;
        cells += "<td>" + score + "</td>";
      });
      tr.innerHTML = cells;
      body.appendChild(tr);
    });

    grandTotals.innerHTML = state.teams
      .map((t, idx) => "<div>" + escapeHtml(t.name) + ": " + runningTotals[idx] + "</div>")
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function addRound() {
    const scores = state.teams.map((team) => computeTeamTotal(team));
    state.history.push({ scores });
    state.teams.forEach((team) => {
      FIELD_DEFS.forEach((f) => (team[f.key] = 0));
      team.wentOut = false;
    });
    saveState();
    renderTeams();
    renderHistory();
  }

  function resetAll() {
    if (!confirm("Reset the whole game? This clears all hands and team names.")) return;
    const count = state.teams.length;
    state = {
      teams: Array.from({ length: count }, (_, i) => defaultTeamState("Team " + (i + 1))),
      history: []
    };
    saveState();
    renderTeams();
    renderHistory();
  }

  function setTeamCount(count) {
    if (state.history.length > 0 && !confirm("Changing the number of teams starts a new game and clears the running score. Continue?")) {
      document.getElementById("teamCount").value = String(state.teams.length);
      return;
    }
    const teams = [];
    for (let i = 0; i < count; i++) {
      teams.push(state.teams[i] || defaultTeamState("Team " + (i + 1)));
    }
    state = { teams, history: [] };
    saveState();
    renderTeams();
    renderHistory();
  }

  document.getElementById("addRound").addEventListener("click", addRound);
  document.getElementById("resetAll").addEventListener("click", resetAll);

  const teamCountSelect = document.getElementById("teamCount");
  teamCountSelect.value = String(state.teams.length);
  teamCountSelect.addEventListener("change", (e) => setTeamCount(Number(e.target.value)));

  renderTeams();
  renderHistory();
})();
