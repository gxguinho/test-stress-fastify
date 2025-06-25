import dotenv from "dotenv";
dotenv.config();
import Fastify from "fastify";
import fastifyCompress from "@fastify/compress";
import fastifyPostgres from "@fastify/postgres";
import { constants as zlibConstants } from "zlib";
import { randomUUID } from "crypto";

interface ProgramadoresRequest {
  apelido: string;
  nome: string;
  nascimento: string;
  stack: string[] | null;
}

const app = Fastify({
  logger: false,
  trustProxy: true,
  ignoreTrailingSlash: true,
  ajv: {
    customOptions: {
      coerceTypes: false,
      useDefaults: false,
      removeAdditional: false,
    },
  },
});

app.register(fastifyPostgres, {
  connectionString: process.env.POSTGRES_URL,
  max: 100,
  min: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
});

app.register(fastifyCompress, {
  threshold: 512,
  encodings: ["gzip", "br"],
  brotliOptions: {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 3,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: 4096,
    },
  },
});

app.addHook("onRequest", async (request, reply) => {
  reply.header("X-Response-Time", "0");
  reply.header("Connection", "keep-alive");
});

app.addHook("onResponse", async (request, reply) => {
  const responseTime = Date.now() - (request as any).startTime;
  reply.header("X-Response-Time", responseTime.toString());
});

app.post<{
  Body: ProgramadoresRequest;
  Reply: any;
}>(
  "/programadores",
  {
    schema: {
      body: {
        type: "object",
        required: ["apelido", "nome", "nascimento"],
        properties: {
          apelido: { type: "string", maxLength: 32 },
          nome: { type: "string", maxLength: 100 },
          nascimento: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          stack: {
            anyOf: [
              {
                type: "array",
                items: { type: "string", maxLength: 32 },
                maxItems: 10,
              },
              { type: "null" },
            ],
          },
        },
        additionalProperties: true,
      },
      response: {
        201: { type: "object", properties: { id: { type: "string" } } },
      },
    },
  },
  async (req, reply) => {
    const id = randomUUID();

    try {
      const { apelido, nome, nascimento, stack } = req.body;

      await app.pg.query("SET LOCAL synchronous_commit = OFF");

      await app.pg.query({
        name: "insert-programador-optimized",
        text: `INSERT INTO programadores(id, apelido, nome, nascimento, stack)
         VALUES($1,$2,$3,$4,$5)`,
        values: [id, apelido, nome, nascimento, stack],
      });

      reply.status(201).header("Location", `/programadores/${id}`).send({ id });
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(422).send({ error: "Apelido já existe" });
      }
      reply.status(500).send({ error: err.message });
    }
  }
);

app.get("/contagem-programadores", async (req, res) => {
  const result = await app.pg.query("SELECT COUNT(*) FROM programadores");
  res.status(200).type("text/plain").send(result.rows[0].count);
});

export function start() {
  return new Promise((resolve) => {
    const port = Number(process.env.PORT) || 8081;

    if (app.server) {
      (app.server as any).keepAliveTimeout = 65 * 1000;
      (app.server as any).headersTimeout = 66 * 1000;
      (app.server as any).maxConnections = 1000;

      app.server.on("connection", (socket) => {
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 60000);
      });
    }

    app.listen(
      {
        port,
        host: "0.0.0.0",
        backlog: 511,
      },
      (err, address) => {
        if (err) {
          app.log.error(err);
          process.exit(1);
        }
        console.log(`Worker ${process.pid} ouvindo em ${address}`);
        resolve(app);
      }
    );
  });
}

start();
