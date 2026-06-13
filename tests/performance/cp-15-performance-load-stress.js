import http from "k6/http";
import { check, sleep } from "k6";
//USAMOS LOCALHOST COMO RUTA BASE
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    performance: {  //DEFINIMOS LA PERFORMANCE-- 1 USUARIO VIRTUAL DURANTE 10 SEGUNDOS
      executor: "constant-vus",
      vus: 1,
      duration: "10s",
      tags: { test_type: "performance" },
    },
    carga: {  //DEFINIMOS LA CARGA-- 5 USUARIOS VIRTUALES DURANTE 20 SEGUNDOS
      executor: "constant-vus",
      vus: 5,
      duration: "20s",
      startTime: "12s",
      tags: { test_type: "carga" },
    },
    estres: {   //DEFINIMOS EL ESTRES-- SUBIR PREOGRESIVAMENTE HASTA 10 SEGUNDOS Y LUEGO BAJAR
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 5 },
        { duration: "10s", target: 10 },
        { duration: "10s", target: 0 },
      ],
      startTime: "35s",
      tags: { test_type: "estres" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function runLoadStressScenario() {
  const response = http.get(`${BASE_URL}/`);

  check(response, {     //VALIDACION-- LA RUTA DEBE RESPONDER 200 Y DEBE TARDAR MENOS DE 1 SEGUNDO
    "la respuesta tiene estado 200": (res) => res.status === 200,
    "la respuesta tarda menos de 1 segundo": (res) => res.timings.duration < 1000,
  });

  sleep(1);
}
