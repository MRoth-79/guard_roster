const DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const SLOTS = ["02-06","06-10","10-14","14-18","18-22","22-02"];

let matrix = [];

export function initGrid() {
  matrix = SLOTS.map(()=>DAYS.map(()=> ""));
  render();
}

function render() {
  let html = "<table>";

  html += "<tr><th>שעה</th>";
  DAYS.forEach(d=>html += `<th>${d}</th>`);
  html += "</tr>";

  SLOTS.forEach((slot,r)=>{
    html += `<tr><td>${slot}</td>`;
    DAYS.forEach((_,c)=>{
      html += `<td contenteditable data-r="${r}" data-c="${c}"></td>`;
    });
    html += "</tr>";
  });

  html += "</table>";

  document.getElementById("grid").innerHTML = html;
}
``
