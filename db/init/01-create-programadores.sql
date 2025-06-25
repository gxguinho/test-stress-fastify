CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS programadores (
  id UUID PRIMARY KEY,
  apelido VARCHAR(32) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  nascimento DATE NOT NULL,
  stack TEXT[]
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programadores_apelido ON programadores(apelido);
