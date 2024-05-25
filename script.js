let minHeartRate = Infinity;
let maxHeartRate = -Infinity;
let overflow = 12;
let steps = 3;

const down = (ctx, value) =>
  ctx.p0.parsed.y > ctx.p1.parsed.y ? value : undefined;
const up = (ctx, value) =>
  ctx.p0.parsed.y < ctx.p1.parsed.y ? value : undefined;
const stagnate = (ctx, value) =>
  ctx.p0.parsed.y == ctx.p1.parsed.y ? value : undefined;

import { apiKey, colortrends } from "./config.js";

console.log(colortrends);

var data = {
  labels: [],
  datasets: [
    {
      label: "Heartrate",
      data: [],
      borderColor: "rgb(149, 165, 166)",
      lineTension: 0.5,
      pointRadius: 5,
      pointBackgroundColor: "#ffffff",
      segment: {
        borderColor: (ctx) =>
          colortrends
            ? down(ctx, "rgb(192, 57, 43)") ||
              up(ctx, "rgb(22, 160, 133)") ||
              stagnate(ctx, "rgb(149, 165, 166)")
            : "rgb(192, 57, 43)",
      },
    },
  ],
};
var config = {
  type: "line",
  data: data,
  options: {
    scales: {
      x: {
        grid: {
          color: "#555",
        },
        ticks: {
          maxRotation: 0,
          font: {
            size: 20,
          },
          color: "#e0e0e0",
          callback: function (value, index, values) {
            if (values.length > overflow) {
              return index % steps === 0 ? this.getLabelForValue(value) : "";
            }
            return this.getLabelForValue(value);
          },
        },
      },
      y: {
        grid: {
          color: "#555",
        },
        ticks: {
          font: {
            size: 20,
          },
          color: "#e0e0e0",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltips: {
        enabled: false,
      },
    },
  },
};

var myChart = new Chart(document.getElementById("myChart"), config);

// Extract tracker ID from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const trackerID = urlParams.get("code");

if (trackerID) {
  connectToHyperateWebSocket(trackerID);
}

let gameMode, state;

function connectToHyperateWebSocket(ID) {
  const API_KEY = apiKey;
  const API_URL = `wss://app.hyperate.io/socket/websocket?token=${API_KEY}`;
  let connection = new WebSocket(API_URL);

  connection.onopen = () => {
    console.log("Hyperate WebSocket Connected");
    connection.send(
      JSON.stringify({
        topic: `hr:${ID}`,
        event: "phx_join",
        payload: {},
        ref: 0,
      })
    );

    setInterval(() => {
      connection.send(
        JSON.stringify({
          topic: "phoenix",
          event: "heartbeat",
          payload: {},
          ref: 0,
        })
      );
    }, 30000);
  };

  connection.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.event === "hr_update") {
      const heartRate = data.payload.hr;
      if (heartRate != 0) {
        updateChart(heartRate);
        document.documentElement.style.setProperty(
          "--pulse-time",
          `${60000 / heartRate}ms`
        );
      }
    }
  };

  connection.onclose = () => {
    console.log("Hyperate WebSocket Closed");
  };

  connection.onerror = (error) => {
    console.error("Hyperate WebSocket Error: ", error);
  };
}

function updateChart(value) {
  var now = new Date();
  now = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();

  document.getElementById("header").innerText = `Current Heart Rate`;

  data.labels.push(now);
  data.datasets[0].data.push(value);

  if (value < minHeartRate) minHeartRate = value;
  if (value > maxHeartRate) maxHeartRate = value;

  updateFooter();

  myChart.update();
  document.getElementById("heartrate-current").innerText = `${value}`;
}

function updateFooter() {
  document.getElementById(
    "footer"
  ).innerText = `Min: ${minHeartRate} | Max: ${maxHeartRate}`;
}
