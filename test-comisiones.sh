#!/bin/bash

# Script de pruebas para el módulo de Comisiones
# Ejecutar desde la raíz del proyecto

API_BASE_URL="${VITE_API_URL:-http://localhost:3001}"

echo "=========================================="
echo "PRUEBAS MÓDULO DE COMISIONES - FASE 1"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para hacer requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ "$method" = "POST" ]; then
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL$endpoint" \
                -H "Content-Type: application/json")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "$body"
    return $http_code
}

# PASO 1: Seed de reglas
echo -e "${YELLOW}PASO 1: Seed de reglas de comisión${NC}"
echo "POST $API_BASE_URL/api/comisiones/reglas/seed"
echo ""

result=$(make_request "POST" "/api/comisiones/reglas/seed")
http_code=$?

if [ $http_code -eq 200 ]; then
    echo -e "${GREEN}✅ Seed ejecutado correctamente${NC}"
    echo "$result" | jq '.'
else
    echo -e "${RED}❌ Error en seed (HTTP $http_code)${NC}"
    echo "$result"
    exit 1
fi

echo ""
echo "Presiona Enter para continuar con el sync de facturas..."
read

# PASO 2: Sync de facturas
echo -e "${YELLOW}PASO 2: Sincronizar facturas desde payments${NC}"
echo "POST $API_BASE_URL/api/comisiones/sync-facturas"
echo ""

result=$(make_request "POST" "/api/comisiones/sync-facturas")
http_code=$?

if [ $http_code -eq 200 ]; then
    echo -e "${GREEN}✅ Sync ejecutado correctamente${NC}"
    echo "$result" | jq '.'
else
    echo -e "${RED}❌ Error en sync (HTTP $http_code)${NC}"
    echo "$result"
    exit 1
fi

echo ""
echo "Presiona Enter para continuar con el cálculo de comisiones..."
read

# PASO 3: Calcular comisiones
PERIODO="2025-01"
echo -e "${YELLOW}PASO 3: Calcular comisiones para $PERIODO${NC}"
echo "POST $API_BASE_URL/api/comisiones/calcular/$PERIODO"
echo ""

result=$(make_request "POST" "/api/comisiones/calcular/$PERIODO")
http_code=$?

if [ $http_code -eq 200 ]; then
    echo -e "${GREEN}✅ Cálculo ejecutado correctamente${NC}"
    echo "$result" | jq '.'
else
    echo -e "${RED}❌ Error en cálculo (HTTP $http_code)${NC}"
    echo "$result"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "PRUEBAS COMPLETADAS"
echo "==========================================${NC}"
echo ""
echo "Siguiente paso: Validar en frontend"
echo "- Vista vendedor: /comisiones (como Guille o Santi)"
echo "- Vista admin: /comisiones (como admin)"
echo ""

