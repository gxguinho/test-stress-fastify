import http from "k6/http";
import { check } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

export let options = {
  vus: 50,
  duration: "5s",
};

export default function () {
  const payload = JSON.stringify({
    apelido: `apelido-${uuidv4()}`.substring(0, 32),
    nome: `nome-${uuidv4()}`.substring(0, 100),
    nascimento: "1985-09-23",
    stack: ["C#", "Node", "Oracle"],
  });

  const headers = { "Content-Type": "application/json" };
  const res = http.post("http://localhost:8082/programadores", payload, {
    headers,
  });

  check(res, {
    "status é 201 (Created)": (r) => r.status === 201,
  });
}
