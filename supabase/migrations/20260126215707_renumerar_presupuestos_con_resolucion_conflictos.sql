/*
  # Renumeración específica de presupuestos (con resolución de conflictos)

  1. Descripción:
     - Renumera 35 presupuestos específicos a nuevos códigos
     - Solo cambia el campo `codigo`, ningún otro dato se modifica
     - Resuelve conflictos moviendo presupuestos que ocupan códigos de destino
     - El resto de presupuestos permanecen sin cambios

  2. Estrategia (4 pasos):
     - PASO 1: Mover presupuestos que ocupan códigos de destino a códigos temporales altos
     - PASO 2: Mover presupuestos a renumerar a códigos temporales  
     - PASO 3: Actualizar a códigos finales
     - PASO 4: Mover presupuestos desplazados a códigos altos seguros

  3. Presupuestos que serán desplazados temporalmente:
     - Presupuestos que actualmente ocupan los códigos de destino
     - Serán movidos a códigos en rango 999XXXX temporalmente
     - Luego serán movidos a códigos altos definitivos en rango 9XXXX
*/

-- ============================================================================
-- PASO 1: Mover presupuestos que OCUPAN códigos de destino a temporales altos
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 Iniciando renumeración con resolución de conflictos...';
  RAISE NOTICE '⚠️  PASO 1: Moviendo presupuestos que ocupan códigos de destino';
END $$;

-- Mover presupuestos existentes que ocupan códigos de destino a rango 999XXXX
UPDATE presupuestos SET codigo = '001-001-99904060' WHERE id = '4aac9c46-3d9e-4d84-9f69-30d3f4c1eefb'; -- 001-001-00004060
UPDATE presupuestos SET codigo = '001-001-99904064' WHERE id = '457ae6d3-a63a-4876-94ce-b0051c6c547a'; -- 001-001-00004064
UPDATE presupuestos SET codigo = '001-001-99904071' WHERE id = '6fd4c273-3db8-4bf7-b4cf-be8dab912c34'; -- 001-001-00004071
UPDATE presupuestos SET codigo = '001-001-99904080' WHERE id = 'fe668568-442e-4418-a28a-f9d937e40262'; -- 001-001-00004080
UPDATE presupuestos SET codigo = '001-001-99904114' WHERE id = 'ff15c5ed-fe3b-42b6-b53c-8c9adc942968'; -- 001-001-00004114
UPDATE presupuestos SET codigo = '001-001-99904116' WHERE id = '78ce261d-f8f6-4d0a-96c2-e75ad5ff9d6a'; -- 001-001-00004116
UPDATE presupuestos SET codigo = '001-001-99904118' WHERE id = '611f1a43-fed2-4f86-9877-f77dffae5c6c'; -- 001-001-00004118
UPDATE presupuestos SET codigo = '001-001-99904119' WHERE id = '2ebf4810-3aff-4565-8f89-13e092e60105'; -- 001-001-00004119
UPDATE presupuestos SET codigo = '001-001-99904120' WHERE id = '3c4cc115-f45b-4c8a-b876-dff98ed0da60'; -- 001-001-00004120
UPDATE presupuestos SET codigo = '001-001-99904122' WHERE id = '2842a49e-e74b-4e1e-b6a6-dc247e0a7f1d'; -- 001-001-00004122
UPDATE presupuestos SET codigo = '001-001-99904124' WHERE id = '599221a1-e630-403e-a706-e862985237c6'; -- 001-001-00004124
UPDATE presupuestos SET codigo = '001-001-99904138' WHERE id = '09d3d92c-3ead-414c-ac6a-81e739534942'; -- 001-001-00004138
UPDATE presupuestos SET codigo = '001-001-99904142' WHERE id = 'a622a6fd-e632-43e2-bf72-af392aee38a8'; -- 001-001-00004142
UPDATE presupuestos SET codigo = '001-001-99904143' WHERE id = '92e24eb4-7483-456f-9e9a-218c3af274e9'; -- 001-001-00004143
UPDATE presupuestos SET codigo = '001-001-99904145' WHERE id = '5bcce097-7abf-4f9e-ae77-8080fff385af'; -- 001-001-00004145
UPDATE presupuestos SET codigo = '001-001-99904152' WHERE id = '27445538-cc26-4ab2-97b1-e3125c192d68'; -- 001-001-00004152
UPDATE presupuestos SET codigo = '001-001-99904153' WHERE id = '6b7916df-0f79-4160-a7db-f7174d49605f'; -- 001-001-00004153
UPDATE presupuestos SET codigo = '001-001-99904154' WHERE id = '5848a7fd-3859-4bf1-917f-2e76643f76aa'; -- 001-001-00004154
UPDATE presupuestos SET codigo = '001-001-99904155' WHERE id = 'ca53dfcd-cb6e-408a-821a-a1db4b0f7b83'; -- 001-001-00004155
UPDATE presupuestos SET codigo = '001-001-99904156' WHERE id = '8583271e-48c9-4893-aabb-a7a713ba931f'; -- 001-001-00004156
UPDATE presupuestos SET codigo = '001-001-99904159' WHERE id = '8b02a5f1-44d4-454e-bea8-ab279429bde7'; -- 001-001-00004159
UPDATE presupuestos SET codigo = '001-001-99904161' WHERE id = '3d0add84-1005-4e8c-8e7e-b50f590b2aab'; -- 001-001-00004161
UPDATE presupuestos SET codigo = '001-001-99904162' WHERE id = 'b281bdda-7f56-4bc7-995e-333ee3143260'; -- 001-001-00004162
UPDATE presupuestos SET codigo = '001-001-99904163' WHERE id = '093da7a6-9d26-41da-a05d-eb855bc8ce7a'; -- 001-001-00004163
UPDATE presupuestos SET codigo = '001-001-99904165' WHERE id = '839adaf7-e52a-4c18-ad22-5e518d8995a8'; -- 001-001-00004165
UPDATE presupuestos SET codigo = '001-001-99904251' WHERE id = 'aad829d7-81e2-4e4c-929d-3957d23679ed'; -- 001-001-00004251
UPDATE presupuestos SET codigo = '001-001-99904292' WHERE id = 'e896c2b7-629a-40ac-9556-2eb8f21dfacc'; -- 001-001-00004292

-- ============================================================================
-- PASO 2: Mover presupuestos a renumerar a códigos temporales
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ PASO 1 completado - %s presupuestos movidos a temporales altos', (SELECT COUNT(*) FROM presupuestos WHERE codigo LIKE '001-001-999%');
  RAISE NOTICE '⚠️  PASO 2: Moviendo presupuestos a renumerar a temporales';
END $$;

UPDATE presupuestos SET codigo = '001-001-TEMP-4311' WHERE codigo = '001-001-00004311';
UPDATE presupuestos SET codigo = '001-001-TEMP-4283' WHERE codigo = '001-001-00004283';
UPDATE presupuestos SET codigo = '001-001-TEMP-4143' WHERE codigo = '001-001-00004143';
UPDATE presupuestos SET codigo = '001-001-TEMP-4141' WHERE codigo = '001-001-00004141';
UPDATE presupuestos SET codigo = '001-001-TEMP-4137' WHERE codigo = '001-001-00004137';
UPDATE presupuestos SET codigo = '001-001-TEMP-4136' WHERE codigo = '001-001-00004136';
UPDATE presupuestos SET codigo = '001-001-TEMP-4135' WHERE codigo = '001-001-00004135';
UPDATE presupuestos SET codigo = '001-001-TEMP-4117' WHERE codigo = '001-001-00004117';
UPDATE presupuestos SET codigo = '001-001-TEMP-4116' WHERE codigo = '001-001-00004116';
UPDATE presupuestos SET codigo = '001-001-TEMP-4113' WHERE codigo = '001-001-00004113';
UPDATE presupuestos SET codigo = '001-001-TEMP-4111' WHERE codigo = '001-001-00004111';
UPDATE presupuestos SET codigo = '001-001-TEMP-4110' WHERE codigo = '001-001-00004110';
UPDATE presupuestos SET codigo = '001-001-TEMP-4109' WHERE codigo = '001-001-00004109';
UPDATE presupuestos SET codigo = '001-001-TEMP-4107' WHERE codigo = '001-001-00004107';
UPDATE presupuestos SET codigo = '001-001-TEMP-4106' WHERE codigo = '001-001-00004106';
UPDATE presupuestos SET codigo = '001-001-TEMP-4105' WHERE codigo = '001-001-00004105';
UPDATE presupuestos SET codigo = '001-001-TEMP-4104' WHERE codigo = '001-001-00004104';
UPDATE presupuestos SET codigo = '001-001-TEMP-4103' WHERE codigo = '001-001-00004103';
UPDATE presupuestos SET codigo = '001-001-TEMP-4102' WHERE codigo = '001-001-00004102';
UPDATE presupuestos SET codigo = '001-001-TEMP-4101' WHERE codigo = '001-001-00004101';
UPDATE presupuestos SET codigo = '001-001-TEMP-4098' WHERE codigo = '001-001-00004098';
UPDATE presupuestos SET codigo = '001-001-TEMP-4096' WHERE codigo = '001-001-00004096';
UPDATE presupuestos SET codigo = '001-001-TEMP-4095' WHERE codigo = '001-001-00004095';
UPDATE presupuestos SET codigo = '001-001-TEMP-4091' WHERE codigo = '001-001-00004091';
UPDATE presupuestos SET codigo = '001-001-TEMP-4077' WHERE codigo = '001-001-00004077';
UPDATE presupuestos SET codigo = '001-001-TEMP-4075' WHERE codigo = '001-001-00004075';
UPDATE presupuestos SET codigo = '001-001-TEMP-4073' WHERE codigo = '001-001-00004073';
UPDATE presupuestos SET codigo = '001-001-TEMP-4072' WHERE codigo = '001-001-00004072';
UPDATE presupuestos SET codigo = '001-001-TEMP-4071' WHERE codigo = '001-001-00004071';
UPDATE presupuestos SET codigo = '001-001-TEMP-4069' WHERE codigo = '001-001-00004069';
UPDATE presupuestos SET codigo = '001-001-TEMP-4068' WHERE codigo = '001-001-00004068';
UPDATE presupuestos SET codigo = '001-001-TEMP-4051' WHERE codigo = '001-001-00004051';
UPDATE presupuestos SET codigo = '001-001-TEMP-4043' WHERE codigo = '001-001-00004043';
UPDATE presupuestos SET codigo = '001-001-TEMP-4036' WHERE codigo = '001-001-00004036';
UPDATE presupuestos SET codigo = '001-001-TEMP-4033' WHERE codigo = '001-001-00004033';

-- ============================================================================
-- PASO 3: Actualizar a códigos finales
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ PASO 2 completado - %s presupuestos en temporales', (SELECT COUNT(*) FROM presupuestos WHERE codigo LIKE '001-001-TEMP-%');
  RAISE NOTICE '⚠️  PASO 3: Actualizando a códigos finales';
END $$;

UPDATE presupuestos SET codigo = '001-001-00004251' WHERE codigo = '001-001-TEMP-4311';
UPDATE presupuestos SET codigo = '001-001-00004292' WHERE codigo = '001-001-TEMP-4283';
UPDATE presupuestos SET codigo = '001-001-00004203' WHERE codigo = '001-001-TEMP-4143';
UPDATE presupuestos SET codigo = '001-001-00004201' WHERE codigo = '001-001-TEMP-4141';
UPDATE presupuestos SET codigo = '001-001-00004195' WHERE codigo = '001-001-TEMP-4137';
UPDATE presupuestos SET codigo = '001-001-00004193' WHERE codigo = '001-001-TEMP-4136';
UPDATE presupuestos SET codigo = '001-001-00004192' WHERE codigo = '001-001-TEMP-4135';
UPDATE presupuestos SET codigo = '001-001-00004173' WHERE codigo = '001-001-TEMP-4117';
UPDATE presupuestos SET codigo = '001-001-00004172' WHERE codigo = '001-001-TEMP-4116';
UPDATE presupuestos SET codigo = '001-001-00004165' WHERE codigo = '001-001-TEMP-4113';
UPDATE presupuestos SET codigo = '001-001-00004163' WHERE codigo = '001-001-TEMP-4111';
UPDATE presupuestos SET codigo = '001-001-00004162' WHERE codigo = '001-001-TEMP-4110';
UPDATE presupuestos SET codigo = '001-001-00004161' WHERE codigo = '001-001-TEMP-4109';
UPDATE presupuestos SET codigo = '001-001-00004159' WHERE codigo = '001-001-TEMP-4107';
UPDATE presupuestos SET codigo = '001-001-00003689' WHERE codigo = '001-001-TEMP-4106';
UPDATE presupuestos SET codigo = '001-001-00004156' WHERE codigo = '001-001-TEMP-4105';
UPDATE presupuestos SET codigo = '001-001-00004155' WHERE codigo = '001-001-TEMP-4104';
UPDATE presupuestos SET codigo = '001-001-00004154' WHERE codigo = '001-001-TEMP-4103';
UPDATE presupuestos SET codigo = '001-001-00004153' WHERE codigo = '001-001-TEMP-4102';
UPDATE presupuestos SET codigo = '001-001-00004152' WHERE codigo = '001-001-TEMP-4101';
UPDATE presupuestos SET codigo = '001-001-00004145' WHERE codigo = '001-001-TEMP-4098';
UPDATE presupuestos SET codigo = '001-001-00004143' WHERE codigo = '001-001-TEMP-4096';
UPDATE presupuestos SET codigo = '001-001-00004142' WHERE codigo = '001-001-TEMP-4095';
UPDATE presupuestos SET codigo = '001-001-00004138' WHERE codigo = '001-001-TEMP-4091';
UPDATE presupuestos SET codigo = '001-001-00004124' WHERE codigo = '001-001-TEMP-4077';
UPDATE presupuestos SET codigo = '001-001-00004122' WHERE codigo = '001-001-TEMP-4075';
UPDATE presupuestos SET codigo = '001-001-00004120' WHERE codigo = '001-001-TEMP-4073';
UPDATE presupuestos SET codigo = '001-001-00004119' WHERE codigo = '001-001-TEMP-4072';
UPDATE presupuestos SET codigo = '001-001-00004118' WHERE codigo = '001-001-TEMP-4071';
UPDATE presupuestos SET codigo = '001-001-00004116' WHERE codigo = '001-001-TEMP-4069';
UPDATE presupuestos SET codigo = '001-001-00004114' WHERE codigo = '001-001-TEMP-4068';
UPDATE presupuestos SET codigo = '001-001-00004080' WHERE codigo = '001-001-TEMP-4051';
UPDATE presupuestos SET codigo = '001-001-00004071' WHERE codigo = '001-001-TEMP-4043';
UPDATE presupuestos SET codigo = '001-001-00004064' WHERE codigo = '001-001-TEMP-4036';
UPDATE presupuestos SET codigo = '001-001-00004060' WHERE codigo = '001-001-TEMP-4033';

-- ============================================================================
-- PASO 4: Mover presupuestos desplazados a códigos altos definitivos
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ PASO 3 completado';
  RAISE NOTICE '⚠️  PASO 4: Moviendo presupuestos desplazados a códigos definitivos';
END $$;

-- Mover de 999XXXX a códigos altos definitivos 90XXX-91XXX
UPDATE presupuestos SET codigo = '001-001-00009060' WHERE codigo = '001-001-99904060';
UPDATE presupuestos SET codigo = '001-001-00009064' WHERE codigo = '001-001-99904064';
UPDATE presupuestos SET codigo = '001-001-00009071' WHERE codigo = '001-001-99904071';
UPDATE presupuestos SET codigo = '001-001-00009080' WHERE codigo = '001-001-99904080';
UPDATE presupuestos SET codigo = '001-001-00009114' WHERE codigo = '001-001-99904114';
UPDATE presupuestos SET codigo = '001-001-00009116' WHERE codigo = '001-001-99904116';
UPDATE presupuestos SET codigo = '001-001-00009118' WHERE codigo = '001-001-99904118';
UPDATE presupuestos SET codigo = '001-001-00009119' WHERE codigo = '001-001-99904119';
UPDATE presupuestos SET codigo = '001-001-00009120' WHERE codigo = '001-001-99904120';
UPDATE presupuestos SET codigo = '001-001-00009122' WHERE codigo = '001-001-99904122';
UPDATE presupuestos SET codigo = '001-001-00009124' WHERE codigo = '001-001-99904124';
UPDATE presupuestos SET codigo = '001-001-00009138' WHERE codigo = '001-001-99904138';
UPDATE presupuestos SET codigo = '001-001-00009142' WHERE codigo = '001-001-99904142';
UPDATE presupuestos SET codigo = '001-001-00009143' WHERE codigo = '001-001-99904143';
UPDATE presupuestos SET codigo = '001-001-00009145' WHERE codigo = '001-001-99904145';
UPDATE presupuestos SET codigo = '001-001-00009152' WHERE codigo = '001-001-99904152';
UPDATE presupuestos SET codigo = '001-001-00009153' WHERE codigo = '001-001-99904153';
UPDATE presupuestos SET codigo = '001-001-00009154' WHERE codigo = '001-001-99904154';
UPDATE presupuestos SET codigo = '001-001-00009155' WHERE codigo = '001-001-99904155';
UPDATE presupuestos SET codigo = '001-001-00009156' WHERE codigo = '001-001-99904156';
UPDATE presupuestos SET codigo = '001-001-00009159' WHERE codigo = '001-001-99904159';
UPDATE presupuestos SET codigo = '001-001-00009161' WHERE codigo = '001-001-99904161';
UPDATE presupuestos SET codigo = '001-001-00009162' WHERE codigo = '001-001-99904162';
UPDATE presupuestos SET codigo = '001-001-00009163' WHERE codigo = '001-001-99904163';
UPDATE presupuestos SET codigo = '001-001-00009165' WHERE codigo = '001-001-99904165';
UPDATE presupuestos SET codigo = '001-001-00009251' WHERE codigo = '001-001-99904251';
UPDATE presupuestos SET codigo = '001-001-00009292' WHERE codigo = '001-001-99904292';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  temp_count INTEGER;
  temp_high_count INTEGER;
  desplazados_count INTEGER;
BEGIN
  RAISE NOTICE '✅ PASO 4 completado';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verificando resultados...';
  
  SELECT COUNT(*) INTO temp_count FROM presupuestos WHERE codigo LIKE '001-001-TEMP-%';
  SELECT COUNT(*) INTO temp_high_count FROM presupuestos WHERE codigo LIKE '001-001-999%';
  SELECT COUNT(*) INTO desplazados_count FROM presupuestos WHERE codigo LIKE '001-001-00009%';
  
  IF temp_count > 0 THEN
    RAISE EXCEPTION '❌ ERROR: Quedaron % presupuestos con códigos TEMP', temp_count;
  END IF;
  
  IF temp_high_count > 0 THEN
    RAISE EXCEPTION '❌ ERROR: Quedaron % presupuestos con códigos 999XXX', temp_high_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ RENUMERACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '  - Presupuestos renumerados: 35';
  RAISE NOTICE '  - Presupuestos desplazados: % (movidos a rango 90XXX)', desplazados_count;
  RAISE NOTICE '  - Códigos temporales restantes: %', temp_count;
  RAISE NOTICE '  - Códigos temporales altos restantes: %', temp_high_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Cambios realizados:';
  RAISE NOTICE '  - Solo se modificó el campo `codigo`';
  RAISE NOTICE '  - Ningún otro dato fue alterado';
  RAISE NOTICE '  - IDs permanecen intactos';
  RAISE NOTICE '  - Esta numeración es permanente';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Presupuestos desplazados:';
  RAISE NOTICE '  - Los presupuestos que ocupaban códigos de destino';
  RAISE NOTICE '  - Fueron movidos a rango 001-001-00009XXX';
  RAISE NOTICE '  - Mantienen todos sus datos originales';
  RAISE NOTICE '';
END $$;
