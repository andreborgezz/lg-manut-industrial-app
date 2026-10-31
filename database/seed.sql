-- ============================================================
-- SEED DE DEMONSTRAÇÃO
-- Usuário: demo@lg.com  /  Senha: Demo@2025
-- ============================================================

-- Usuário de acesso
INSERT INTO usuarios (nome, email, senha_hash) VALUES
  ('André Borges', 'demo@lg.com', '$2b$12$W.vDABLq0UxJ4YAxYKWglulM5rnVn2Mfs82Df/j3KSJBDQL3ppf0W');

-- Mecânicos
INSERT INTO mecanicos (nome, ativo) VALUES
  ('Carlos Souza', true),
  ('Rodrigo Lima', true),
  ('Fábio Martins', true),
  ('Eduardo Nunes', false);

-- Empresas
INSERT INTO empresas (nome, cnpj, email) VALUES
  ('Metalúrgica Vega Ltda', '12.345.678/0001-90', 'compras@metalvega.com.br'),
  ('Indústria Ferro Forte S.A.', '98.765.432/0001-11', 'manutencao@ferroforte.com.br'),
  ('Plásticos Omega Indústria', '55.123.456/0001-33', 'operacoes@plasticosomega.com.br'),
  ('Transportadora Rota Sul', '77.888.999/0001-44', 'frota@rotasul.com.br'),
  ('Frigorífico Central Carnes', '33.444.555/0001-55', 'ti@centralcarnes.com.br');

-- Contatos das empresas
INSERT INTO ctt_empresas (empresa_id, nome, email, cargo, telefone) VALUES
  (1, 'Marcos Pereira', 'marcos@metalvega.com.br', 'Gerente de Manutenção', '(11) 98001-1111'),
  (1, 'Juliana Costa', 'juliana@metalvega.com.br', 'Assistente Técnica', '(11) 98001-2222'),
  (2, 'Paulo Henrique', 'paulo@ferroforte.com.br', 'Supervisor Industrial', '(11) 97002-3333'),
  (3, 'Fernanda Alves', 'fernanda@plasticosomega.com.br', 'Coordenadora de Planta', '(11) 96003-4444'),
  (4, 'Roberto Dias', 'roberto@rotasul.com.br', 'Chefe de Frota', '(11) 95004-5555'),
  (5, 'Aline Mendes', 'aline@centralcarnes.com.br', 'Técnica de Manutenção', '(11) 94005-6666');

-- Solicitantes
INSERT INTO solicitantes (empresa_id, nome, email, telefone) VALUES
  (1, 'Marcos Pereira', 'marcos@metalvega.com.br', '(11) 98001-1111'),
  (1, 'Juliana Costa', 'juliana@metalvega.com.br', '(11) 98001-2222'),
  (2, 'Paulo Henrique', 'paulo@ferroforte.com.br', '(11) 97002-3333'),
  (3, 'Fernanda Alves', 'fernanda@plasticosomega.com.br', '(11) 96003-4444'),
  (4, 'Roberto Dias', 'roberto@rotasul.com.br', '(11) 95004-5555'),
  (5, 'Aline Mendes', 'aline@centralcarnes.com.br', '(11) 94005-6666');

-- Orçamentos (variados: abertos, aprovados, entregues, recusados)
INSERT INTO orcamentos (empresa_id, solicitante_id, mecanico_id, maquina, titulo, escopo, valor, prazo_dias, fim_de_semana, status, entrada_em, numero_pedido, inicio_em, entrega_em) VALUES
  (1, 1, 1, 'Torno CNC Romi GL 240', 'Revisão Torno CNC',
   'Substituição de rolamentos do eixo principal\nLimpeza e lubrificação do cabeçote\nCalibração do encoder de posicionamento\nTeste de ciclo completo',
   4800.00, 5, false, 'ENTREGUE', '2026-08-10', 'PO-2026-0041', '2026-08-12', '2026-08-17'),

  (2, 3, 2, 'Prensa Hidráulica 200T', 'Manutenção Prensa Hidráulica',
   'Troca de vedações do cilindro principal\nSubstituição do fluido hidráulico\nAjuste da válvula de alívio\nVerificação do sistema elétrico de comando',
   7200.00, 7, true, 'ENTREGUE', '2026-08-20', 'PO-2026-0055', '2026-08-22', '2026-08-29'),

  (3, 4, 3, 'Injetora de Plástico 500T', 'Corretiva Injetora',
   'Diagnóstico de falha no sistema de injeção\nSubstituição da bomba de óleo\nAlinhamento do molde\nParametrização do CLP',
   9500.00, 10, false, 'APROVADO', '2026-09-05', 'PO-2026-0072', '2026-09-08', null),

  (1, 2, 1, 'Fresadora Vertical Bridgeport', 'Revisão Geral Fresadora',
   'Troca de guias lineares\nSubstituição do motor de avanço\nNivelamento da mesa\nLubrificação geral',
   6300.00, 8, false, 'APROVADO', '2026-09-12', 'PO-2026-0081', '2026-09-15', null),

  (4, 5, 2, 'Caminhão Volvo FH 460 - Placa ABC-1234', 'Manutenção Preventiva Frota',
   'Troca de óleo e filtros\nVerificação do sistema de freios\nInspeção da suspensão\nDiagnóstico eletrônico OBD',
   2100.00, 3, false, 'ENTREGUE', '2026-09-18', null, '2026-09-19', '2026-09-22'),

  (5, 6, 3, 'Câmara Fria Carrier 40TR', 'Revisão Sistema de Refrigeração',
   'Recarga de gás R-404A\nLimpeza do condensador\nVerificação do compressor\nCalibração do termostato',
   3400.00, 4, false, 'RECUSADO', '2026-09-25', null, null, null),

  (2, 3, 1, 'Guilhotina Hidráulica Ficep 3000mm', 'Corretiva Guilhotina',
   'Substituição da lâmina superior\nAjuste do prensa-chapa\nTroca dos amortecedores\nTeste de corte em chapa 10mm',
   5600.00, 6, false, 'ABERTO', '2026-10-02', null, null, null),

  (3, 4, 2, 'Extrusora Battenfeld 90mm', 'Preventiva Extrusora',
   'Limpeza do canhão e rosca\nTroca de resistências da zona de aquecimento\nVerificação do sistema de dosagem\nCalibração do perfil de temperatura',
   4200.00, 5, false, 'ABERTO', '2026-10-10', null, null, null),

  (1, 1, 3, 'Retífica Plana Blanchard 32D', 'Manutenção Retífica',
   'Balanceamento do rebolo\nTroca do fluido de corte\nRegulagem da mesa magnética\nVerificação do sistema de filtragem',
   3800.00, 4, true, 'ABERTO', '2026-10-18', null, null, null),

  (4, 5, 1, 'Empilhadeira Toyota 2.5T - Série 8FBE25', 'Revisão Empilhadeira Elétrica',
   'Substituição das baterias tracionárias\nRegulagem do mástro\nTroca dos pneus\nVerificação do sistema de direção',
   8900.00, 9, false, 'ABERTO', '2026-10-25', null, null, null),

  (5, 6, 2, 'Compressor Parafuso Atlas Copco GA 55', 'Preventiva Compressor',
   'Troca do filtro separador de óleo\nSubstituição do elemento filtrante de ar\nTroca do óleo sintético\nLimpeza do resfriador',
   2800.00, 3, false, 'ABERTO', '2026-10-28', null, null, null),

  (2, 3, 3, 'Ponte Rolante 10T Demag', 'Revisão Ponte Rolante',
   'Inspeção dos cabos de aço\nTroca dos ganchos de segurança\nVerificação dos fins de curso\nTeste de carga nominal',
   11200.00, 12, false, 'ABERTO', '2026-10-29', null, null, null);
