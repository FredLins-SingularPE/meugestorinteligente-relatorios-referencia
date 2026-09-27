import React, { useState, useRef, useEffect, useMemo } from 'react';
import { openPrintWindow } from '../../utils/printWindow';
import 'tinymce/tinymce';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/icons/default';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/code';
import 'tinymce/plugins/pagebreak';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { PortalConfig, MenuItem, FormTemplate } from '../../types';
import { APP_MENU_STRUCTURE, FORM_CONTEXT_REGISTRY } from '../../constants';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useSecurity } from '../../contexts/SecurityContext';
import { useAudit } from '../../contexts/AuditContext';
import { useKeyboardShortcut } from '../../contexts/KeyboardShortcutContext';
import { useEntityCRUD } from '../../hooks/useEntityCRUD';
import { api } from '../../services/apiService';

interface FormsBuilderProps {
  config: PortalConfig;
  onRefresh?: () => void;
}

interface VariableItem {
    label: string;
    value: string;
}

interface VariableCategory {
    category: string;
    items: VariableItem[];
}

function flattenMenuItems(items: MenuItem[], parentLabel?: string): { id: string; label: string; depth: number }[] {
    const result: { id: string; label: string; depth: number }[] = [];
    for (const item of items) {
        if (item.hidden) continue;
        const label = parentLabel ? `${parentLabel} > ${item.label}` : item.label;
        result.push({ id: item.id, label, depth: parentLabel ? (parentLabel.includes('>') ? 2 : 1) : 0 });
        if (item.subItems) {
            result.push(...flattenMenuItems(item.subItems, label));
        }
    }
    return result;
}

const FLAT_MENU_ITEMS = flattenMenuItems(APP_MENU_STRUCTURE);

const MOCK_FORMS: FormTemplate[] = [
    {
        id: '1',
        name: 'Contrato de Prestação de Serviços',
        description: 'Modelo padrão para novos clientes de consultoria.',
        updatedAt: '2023-10-25',
        header: '<div style="text-align: center;"><span style="font-size: 18px; font-weight: bold;">FINANCEPRO ASSESSORIA</span></div>',
        content: '<p>Pelo presente instrumento particular, de um lado <b>{{empresa.razao_social}}</b>...</p>',
        footer: '<div style="text-align: center; font-size: 10px; color: #666;">Página 1 de 1</div>',
        menuIds: ['com_admissao', 'rel_formularios']
    },
    {
        id: '2',
        name: 'Procuração INSS',
        description: 'Procuração específica para atuação junto ao órgão.',
        updatedAt: '2023-10-20',
        header: '',
        content: '<p><b>OUTORGANTE:</b> {{cliente.nome}}, nacionalidade...</p>',
        footer: '',
        menuIds: ['rel_formularios']
    },
    {
        id: '3',
        name: 'Folha de Rosto - Empréstimo Pessoal',
        description: 'Folha de rosto para processos de empréstimo pessoal.',
        updatedAt: '2026-02-23',
        header: '',
        content: `<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px;">
<tbody>
<tr><td colspan="6" style="padding: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #333;">DADOS DO CLIENTE</td></tr>
<tr>
<td style="padding: 6px; font-weight: bold; width: 15%;">CLIENTE:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.nome}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">CPF/MF Nº:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc; width: 25%;">{{cliente.documento}}</td>
<td style="padding: 6px; font-weight: bold; width: 10%;">RG:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.rg}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">TELEFONE:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.telefone}}</td>
<td style="padding: 6px; font-weight: bold;">PROFISSÃO:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.profissao}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">ESTADO CIVIL:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.estado_civil}}</td>
<td style="padding: 6px; font-weight: bold;">DATA NASC:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.data_nascimento}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">ENDEREÇO:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.endereco}}, {{cliente.numero}} - {{cliente.bairro}}, {{cliente.cidade}} - {{cliente.uf}}, {{cliente.cep}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">BANCO:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{banco.nome}}</td>
<td style="padding: 6px; font-weight: bold;">CONSULTOR:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{colaborador.nome}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">EMAIL:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.email}}</td>
</tr>
<tr>
<td colspan="6" style="padding: 6px; font-size: 9px; color: #666;">O cliente autoriza o envio de feedbacks e informativos pelo e-mail informado acima.</td>
</tr>
<tr>
<td colspan="3" style="padding: 6px;">☐ INDICAÇÃO &nbsp;&nbsp; ☐ RÁDIO &nbsp;&nbsp; ☐ OUTRO</td>
<td colspan="3" style="padding: 6px; font-weight: bold;">CONTRATO NÚMERO: {{admissao.contrato}}</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr style="background: #f0f0f0;">
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Código</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Und.</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Descrição</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Quantidade</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Unitário</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Total</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">GESTÃO</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">2</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">CUSTOS FINAIS DA ECONOMIA</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">20%</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">Variável</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">3</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">CUSTOS INICIAIS</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr style="background: #f9f9f9;">
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">Subtotal:</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr>
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right;">Desc./Acres.</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$0,00</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$0,00</td>
</tr>
<tr style="background: #f0f0f0; font-weight: bold;">
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right;">Total:</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr><td colspan="6" style="padding: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #333;">PRODUTO: EMPRÉSTIMO PESSOAL</td></tr>
<tr>
<td colspan="3" style="padding: 0; vertical-align: top;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Produto</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; width: 50%;">Parcelas Totais:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.total_parcelas}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas Pagas:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_pagas}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas em Atraso:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_atraso}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Valor Financiado:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.valor_financiado}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Valor Parcela:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.valor_parcela}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dia Vencimento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.dia_vencimento}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Tipo Pagamento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.forma_pagamento}}</td></tr>
</table>
</td>
<td colspan="3" style="padding: 0; vertical-align: top;">&nbsp;</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="6" style="padding: 0;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Recálculo</td><td colspan="4" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Outras Informações</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas a pagar:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_a_pagar}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">&nbsp;</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dívida Original:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.divida_original}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">TAXA ADMINISTRATIVA: {{admissao.taxa_administrativa}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcela Recálculo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.parcela}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">1° PARCELA: {{admissao.parcela1}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dívida Recálculo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.divida}}</td><td colspan="4" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Planejamento de Quitação</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Economia:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.economia}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Prazo</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">12 meses</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">18 meses</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">24 meses</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dia Vencimento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.dia_vencimento}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Percentual</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">30%</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">&nbsp;</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">&nbsp;</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Modalidade:</td><td style="padding: 5px; border: 1px solid #ccc;">{{modalidade.descricao}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Recalculo</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td></tr>
</table>
</td>
</tr>

<tr><td colspan="6" style="padding: 30px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="6" style="padding: 6px; text-align: right; font-size: 11px;">{{empresa.cidade}}, {{admissao.data}}</td>
</tr>

<tr><td colspan="6" style="padding: 40px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="3" style="padding: 6px; text-align: center; border-top: 1px solid #333;">{{cliente.nome}}</td>
<td colspan="3" style="padding: 6px; text-align: center; border-top: 1px solid #333;">{{empresa.razao_social}}</td>
</tr>
</tbody>
</table>`,
        footer: `<div style="text-align: center; font-size: 9px; color: #666; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px;">{{empresa.endereco}}, {{empresa.numero}}, {{empresa.bairro}}, {{empresa.cidade}} - {{empresa.uf}}, {{empresa.complemento}}, CEP: {{empresa.cep}}, Telefone: {{empresa.telefone}}.</div>`,
        docxTemplate: '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',
    menuIds: ['com_admissao']
    },
    {
        id: '4',
        name: 'Folha de Rosto - Cartão de Crédito',
        description: 'Folha de rosto para processos de cartão de crédito.',
        updatedAt: '2026-02-23',
        header: '',
        content: `<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px;">
<tbody>
<tr><td colspan="6" style="padding: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #333;">DADOS DO CLIENTE</td></tr>
<tr>
<td style="padding: 6px; font-weight: bold; width: 15%;">CLIENTE:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.nome}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">CPF/MF Nº:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc; width: 25%;">{{cliente.documento}}</td>
<td style="padding: 6px; font-weight: bold; width: 10%;">RG:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.rg}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">TELEFONE:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.telefone}}</td>
<td style="padding: 6px; font-weight: bold;">PROFISSÃO:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.profissao}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">ESTADO CIVIL:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.estado_civil}}</td>
<td style="padding: 6px; font-weight: bold;">DATA NASC:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.data_nascimento}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">ENDEREÇO:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.endereco}}, {{cliente.numero}} - {{cliente.bairro}}, {{cliente.cidade}} - {{cliente.uf}}, {{cliente.cep}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">BANCO:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{banco.nome}}</td>
<td style="padding: 6px; font-weight: bold;">CONSULTOR:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{colaborador.nome}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">EMAIL:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.email}}</td>
</tr>
<tr>
<td colspan="6" style="padding: 6px; font-size: 9px; color: #666;">O cliente autoriza o envio de feedbacks e informativos pelo e-mail informado acima.</td>
</tr>
<tr>
<td colspan="3" style="padding: 6px;">☐ INDICAÇÃO &nbsp;&nbsp; ☐ RÁDIO &nbsp;&nbsp; ☐ OUTRO</td>
<td colspan="3" style="padding: 6px; font-weight: bold;">CONTRATO NÚMERO: {{admissao.contrato}}</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr style="background: #f0f0f0;">
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Código</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Und.</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Descrição</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Quantidade</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Unitário</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Total</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">GESTÃO</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">2</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">CUSTOS FINAIS DA ECONOMIA</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">20%</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">Variável</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">3</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">CUSTOS INICIAIS</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr style="background: #f9f9f9;">
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">Subtotal:</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr>
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right;">Desc./Acres.</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$0,00</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$0,00</td>
</tr>
<tr style="background: #f0f0f0; font-weight: bold;">
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right;">Total:</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr><td colspan="6" style="padding: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #333;">PRODUTO: CARTÃO DE CRÉDITO</td></tr>
<tr>
<td colspan="3" style="padding: 0; vertical-align: top;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Produto</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; width: 50%;">Parcelas Totais:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.total_parcelas}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas Pagas:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_pagas}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas em Atraso:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_atraso}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Valor Financiado:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.valor_financiado}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Valor Parcela:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.valor_parcela}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dia Vencimento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.dia_vencimento}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Tipo Pagamento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.forma_pagamento}}</td></tr>
</table>
</td>
<td colspan="3" style="padding: 0; vertical-align: top;">&nbsp;</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="6" style="padding: 0;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Recálculo</td><td colspan="4" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Outras Informações</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas a pagar:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_a_pagar}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">&nbsp;</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dívida Original:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.divida_original}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">TAXA ADMINISTRATIVA: {{admissao.taxa_administrativa}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcela Recálculo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.parcela}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">1° PARCELA: {{admissao.parcela1}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dívida Recálculo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.divida}}</td><td colspan="4" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Planejamento de Quitação</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Economia:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.economia}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Prazo</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">12 meses</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">18 meses</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">24 meses</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dia Vencimento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.dia_vencimento}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Percentual</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">30%</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">&nbsp;</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">&nbsp;</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Modalidade:</td><td style="padding: 5px; border: 1px solid #ccc;">{{modalidade.descricao}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Recalculo</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td></tr>
</table>
</td>
</tr>

<tr><td colspan="6" style="padding: 30px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="6" style="padding: 6px; text-align: right; font-size: 11px;">{{empresa.cidade}}, {{admissao.data}}</td>
</tr>

<tr><td colspan="6" style="padding: 40px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="3" style="padding: 6px; text-align: center; border-top: 1px solid #333;">{{cliente.nome}}</td>
<td colspan="3" style="padding: 6px; text-align: center; border-top: 1px solid #333;">{{empresa.razao_social}}</td>
</tr>
</tbody>
</table>`,
        footer: `<div style="text-align: center; font-size: 9px; color: #666; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px;">{{empresa.endereco}}, {{empresa.numero}}, {{empresa.bairro}}, {{empresa.cidade}} - {{empresa.uf}}, {{empresa.complemento}}, CEP: {{empresa.cep}}, Telefone: {{empresa.telefone}}.</div>`,
        docxTemplate: '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',
    menuIds: ['com_admissao']
    },
    {
        id: '5',
        name: 'Folha de Rosto - Veículo',
        description: 'Folha de rosto para processos de financiamento de veículo.',
        updatedAt: '2026-02-23',
        header: '',
        content: `<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px;">
<tbody>
<tr><td colspan="6" style="padding: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #333;">DADOS DO CLIENTE</td></tr>
<tr>
<td style="padding: 6px; font-weight: bold; width: 15%;">CLIENTE:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.nome}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">CPF/MF Nº:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc; width: 25%;">{{cliente.documento}}</td>
<td style="padding: 6px; font-weight: bold; width: 10%;">RG:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.rg}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">TELEFONE:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.telefone}}</td>
<td style="padding: 6px; font-weight: bold;">PROFISSÃO:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.profissao}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">ESTADO CIVIL:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.estado_civil}}</td>
<td style="padding: 6px; font-weight: bold;">DATA NASC:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.data_nascimento}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">ENDEREÇO:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.endereco}}, {{cliente.numero}} - {{cliente.bairro}}, {{cliente.cidade}} - {{cliente.uf}}, {{cliente.cep}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">BANCO:</td>
<td style="padding: 6px; border-bottom: 1px solid #ccc;">{{banco.nome}}</td>
<td style="padding: 6px; font-weight: bold;">CONSULTOR:</td>
<td colspan="3" style="padding: 6px; border-bottom: 1px solid #ccc;">{{colaborador.nome}}</td>
</tr>
<tr>
<td style="padding: 6px; font-weight: bold;">EMAIL:</td>
<td colspan="5" style="padding: 6px; border-bottom: 1px solid #ccc;">{{cliente.email}}</td>
</tr>
<tr>
<td colspan="6" style="padding: 6px; font-size: 9px; color: #666;">O cliente autoriza o envio de feedbacks e informativos pelo e-mail informado acima.</td>
</tr>
<tr>
<td colspan="3" style="padding: 6px;">☐ INDICAÇÃO &nbsp;&nbsp; ☐ RÁDIO &nbsp;&nbsp; ☐ OUTRO</td>
<td colspan="3" style="padding: 6px; font-weight: bold;">CONTRATO NÚMERO: {{admissao.contrato}}</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr style="background: #f0f0f0;">
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Código</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Und.</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Descrição</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Quantidade</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Unitário</td>
<td style="padding: 6px; font-weight: bold; border: 1px solid #ccc; text-align: center;">Total</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">GESTÃO</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">2</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">CUSTOS FINAIS DA ECONOMIA</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">20%</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">Variável</td>
</tr>
<tr>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">3</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">UN</td>
<td style="padding: 6px; border: 1px solid #ccc;">CUSTOS INICIAIS</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr style="background: #f9f9f9;">
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">Subtotal:</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>
<tr>
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right;">Desc./Acres.</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$0,00</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$0,00</td>
</tr>
<tr style="background: #f0f0f0; font-weight: bold;">
<td colspan="4" style="padding: 6px; border: 1px solid #ccc; text-align: right;">Total:</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
<td style="padding: 6px; border: 1px solid #ccc; text-align: right;">R$</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr><td colspan="6" style="padding: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #333;">PRODUTO: FINANCIAMENTO DE VEÍCULO</td></tr>
<tr>
<td colspan="3" style="padding: 0; vertical-align: top;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Financiamento</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; width: 50%;">Parcelas Totais:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.total_parcelas}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas Pagas:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_pagas}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas em Atraso:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_atraso}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Valor Financiado:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.valor_financiado}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Valor Parcela:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.valor_parcela}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dia Vencimento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.dia_vencimento}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Tipo Pagamento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.forma_pagamento}}</td></tr>
</table>
</td>
<td colspan="3" style="padding: 0; vertical-align: top;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Veículo</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; width: 50%;">Marca:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.marca_veiculo}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Modelo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.modelo_veiculo}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Cor:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.cor_veiculo}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Ano:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.ano_veiculo}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Placa:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.placa}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Chassi:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.chassi}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Renavam:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.renavam}}</td></tr>
</table>
</td>
</tr>

<tr><td colspan="6" style="padding: 15px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="6" style="padding: 0;">
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Informações do Recálculo</td><td colspan="4" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Outras Informações</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcelas a pagar:</td><td style="padding: 5px; border: 1px solid #ccc;">{{admissao.parcelas_a_pagar}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">&nbsp;</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dívida Original:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.divida_original}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">TAXA ADMINISTRATIVA: {{admissao.taxa_administrativa}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Parcela Recálculo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.parcela}}</td><td colspan="4" style="padding: 5px; border: 1px solid #ccc;">1° PARCELA: {{admissao.parcela1}}</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dívida Recálculo:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.divida}}</td><td colspan="4" style="padding: 6px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc;">Planejamento de Quitação</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Economia:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.economia}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Prazo</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">12 meses</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">18 meses</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">24 meses</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Dia Vencimento:</td><td style="padding: 5px; border: 1px solid #ccc;">{{recalculo.dia_vencimento}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Percentual</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">30%</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">&nbsp;</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">&nbsp;</td></tr>
<tr><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Modalidade:</td><td style="padding: 5px; border: 1px solid #ccc;">{{modalidade.descricao}}</td><td style="padding: 5px; border: 1px solid #ccc; font-weight: bold;">Recalculo</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center;">R$</td></tr>
</table>
</td>
</tr>

<tr><td colspan="6" style="padding: 30px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="6" style="padding: 6px; text-align: right; font-size: 11px;">{{empresa.cidade}}, {{admissao.data}}</td>
</tr>

<tr><td colspan="6" style="padding: 40px 0 5px 0;">&nbsp;</td></tr>

<tr>
<td colspan="3" style="padding: 6px; text-align: center; border-top: 1px solid #333;">{{cliente.nome}}</td>
<td colspan="3" style="padding: 6px; text-align: center; border-top: 1px solid #333;">{{empresa.razao_social}}</td>
</tr>
</tbody>
</table>`,
        footer: `<div style="text-align: center; font-size: 9px; color: #666; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px;">{{empresa.endereco}}, {{empresa.numero}}, {{empresa.bairro}}, {{empresa.cidade}} - {{empresa.uf}}, {{empresa.complemento}}, CEP: {{empresa.cep}}, Telefone: {{empresa.telefone}}.</div>`,
        docxTemplate: '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',
    menuIds: ['com_admissao']
    }
];

function generateDynamicVariables(config: PortalConfig): VariableCategory[] {
    const categories: VariableCategory[] = [];

    if (config.clients) {
        const clientFields = [
            { label: 'Código (ID)', value: '{{cliente.id}}' },
            { label: 'Nome / Razão Social', value: '{{cliente.nome}}' },
            { label: 'Tipo (Física/Jurídica)', value: '{{cliente.tipo}}' },
            { label: 'CPF / CNPJ', value: '{{cliente.documento}}' },
            { label: 'RG', value: '{{cliente.rg}}' },
            { label: 'E-mail', value: '{{cliente.email}}' },
            { label: 'Telefone Principal', value: '{{cliente.telefone}}' },
            { label: 'Telefone Secundário', value: '{{cliente.telefone2}}' },
            { label: 'Profissão', value: '{{cliente.profissao}}' },
            { label: 'Estado Civil', value: '{{cliente.estado_civil}}' },
            { label: 'Data de Nascimento', value: '{{cliente.data_nascimento}}' },
            { label: 'CEP', value: '{{cliente.cep}}' },
            { label: 'Endereço (Rua)', value: '{{cliente.endereco}}' },
            { label: 'Número', value: '{{cliente.numero}}' },
            { label: 'Complemento', value: '{{cliente.complemento}}' },
            { label: 'Bairro', value: '{{cliente.bairro}}' },
            { label: 'Cidade', value: '{{cliente.cidade}}' },
            { label: 'Estado (UF)', value: '{{cliente.uf}}' },
            { label: 'Anotações', value: '{{cliente.anotacoes}}' },
        ];
        categories.push({ category: 'Cliente (Responsável)', items: clientFields });
        categories.push({
            category: 'Titular (quando aplicável)',
            items: clientFields.map(f => ({
                label: f.label,
                value: f.value.replace('{{cliente.', '{{titular.'),
            })),
        });
    }

    if (config.collaborators) {
        categories.push({
            category: 'Colaborador',
            items: [
                { label: 'Código (ID)', value: '{{colaborador.id}}' },
                { label: 'Nome Completo', value: '{{colaborador.nome}}' },
                { label: 'Cargo / Função', value: '{{colaborador.cargo}}' },
                { label: 'E-mail', value: '{{colaborador.email}}' },
                { label: 'Telefone', value: '{{colaborador.telefone}}' },
                { label: 'É Whatsapp?', value: '{{colaborador.whatsapp}}' },
                { label: 'Estado Civil', value: '{{colaborador.estado_civil}}' },
                { label: 'Data de Nascimento', value: '{{colaborador.data_nascimento}}' },
                { label: 'CEP', value: '{{colaborador.cep}}' },
                { label: 'Endereço', value: '{{colaborador.endereco}}' },
                { label: 'Número', value: '{{colaborador.numero}}' },
                { label: 'Complemento', value: '{{colaborador.complemento}}' },
                { label: 'Bairro', value: '{{colaborador.bairro}}' },
                { label: 'Cidade', value: '{{colaborador.cidade}}' },
                { label: 'Estado (UF)', value: '{{colaborador.uf}}' },
                { label: 'Anotações', value: '{{colaborador.anotacoes}}' },
            ]
        });
    }

    if (config.banks) {
        categories.push({
            category: 'Banco',
            items: [
                { label: 'Código (ID)', value: '{{banco.id}}' },
                { label: 'Nome do Banco', value: '{{banco.nome}}' },
                { label: 'Cód. Febraban', value: '{{banco.febraban}}' },
                { label: 'Status', value: '{{banco.status}}' },
                { label: 'Anotações', value: '{{banco.anotacoes}}' },
            ]
        });
    }

    if (config.units) {
        categories.push({
            category: 'Empresa / Unidade',
            items: [
                { label: 'Razão Social', value: '{{empresa.razao_social}}' },
                { label: 'CNPJ', value: '{{empresa.cnpj}}' },
                { label: 'Telefone Geral', value: '{{empresa.telefone}}' },
                { label: 'E-mail Geral', value: '{{empresa.email}}' },
                { label: 'CEP', value: '{{empresa.cep}}' },
                { label: 'Endereço', value: '{{empresa.endereco}}' },
                { label: 'Número', value: '{{empresa.numero}}' },
                { label: 'Complemento', value: '{{empresa.complemento}}' },
                { label: 'Bairro', value: '{{empresa.bairro}}' },
                { label: 'Cidade', value: '{{empresa.cidade}}' },
                { label: 'Estado (UF)', value: '{{empresa.uf}}' },
                { label: 'Taxa Mínima', value: '{{empresa.taxa_minima}}' },
            ]
        });
    }

    if (config.admissions) {
        categories.push({
            category: 'Admissão',
            items: [
                { label: 'Código (ID)', value: '{{admissao.id}}' },
                { label: 'Data', value: '{{admissao.data}}' },
                { label: 'Nome do Cliente', value: '{{admissao.cliente}}' },
                { label: 'Nº do Contrato', value: '{{admissao.contrato}}' },
                { label: 'Total de Parcelas', value: '{{admissao.total_parcelas}}' },
                { label: 'Parcelas Pagas', value: '{{admissao.parcelas_pagas}}' },
                { label: 'Parcelas em Atraso', value: '{{admissao.parcelas_atraso}}' },
                { label: 'Parcelas a Pagar', value: '{{admissao.parcelas_a_pagar}}' },
                { label: 'Valor Financiado', value: '{{admissao.valor_financiado}}' },
                { label: 'Valor da Parcela', value: '{{admissao.valor_parcela}}' },
                { label: 'Dia de Vencimento', value: '{{admissao.dia_vencimento}}' },
                { label: 'Forma de Pagamento', value: '{{admissao.forma_pagamento}}' },
                { label: 'Tipo de Indicação', value: '{{admissao.tipo_indicacao}}' },
                { label: 'Tipo de Origem', value: '{{admissao.tipo_origem}}' },
                { label: 'Status', value: '{{admissao.status}}' },
                { label: 'Taxa Administrativa', value: '{{admissao.taxa_administrativa}}' },
                { label: '1ª Parcela', value: '{{admissao.parcela1}}' },
                { label: 'Valor Boletos', value: '{{admissao.parcela2}}' },
                { label: 'Info Adicional 1', value: '{{admissao.info1}}' },
                { label: 'Info Adicional 2', value: '{{admissao.info2}}' },
                { label: 'Marca do Veículo', value: '{{admissao.marca_veiculo}}' },
                { label: 'Modelo do Veículo', value: '{{admissao.modelo_veiculo}}' },
                { label: 'Cor do Veículo', value: '{{admissao.cor_veiculo}}' },
                { label: 'Ano do Veículo', value: '{{admissao.ano_veiculo}}' },
                { label: 'Placa do Veículo', value: '{{admissao.placa}}' },
                { label: 'Chassi do Veículo', value: '{{admissao.chassi}}' },
                { label: 'Renavam do Veículo', value: '{{admissao.renavam}}' },
                { label: '1ª Parcela Vencimento', value: '{{admissao.primeiro_vencimento}}' },
            ]
        });

        categories.push({
            category: 'Recálculo (Cenário)',
            items: [
                { label: 'Parcelas a Pagar', value: '{{recalculo.parcelas_a_pagar}}' },
                { label: 'Dívida Original', value: '{{recalculo.divida_original}}' },
                { label: 'Parcela Recálculo', value: '{{recalculo.parcela}}' },
                { label: 'Dívida Recálculo', value: '{{recalculo.divida}}' },
                { label: 'Economia', value: '{{recalculo.economia}}' },
                { label: 'Dia de Vencimento', value: '{{recalculo.dia_vencimento}}' },
            ]
        });
    }

    if (config.modalities) {
        categories.push({
            category: 'Modalidade',
            items: [
                { label: 'Código (ID)', value: '{{modalidade.id}}' },
                { label: 'Tipo', value: '{{modalidade.tipo}}' },
                { label: 'Descrição', value: '{{modalidade.descricao}}' },
            ]
        });
    }

    if (config.products) {
        categories.push({
            category: 'Produto',
            items: [
                { label: 'Código (ID)', value: '{{produto.id}}' },
                { label: 'Tipo', value: '{{produto.tipo}}' },
                { label: 'Descrição', value: '{{produto.descricao}}' },
                { label: 'Unidade', value: '{{produto.unidade}}' },
            ]
        });
    }

    if (config.services) {
        categories.push({
            category: 'Serviço',
            items: [
                { label: 'Código (ID)', value: '{{servico.id}}' },
                { label: 'Nome', value: '{{servico.nome}}' },
                { label: 'Duração (min)', value: '{{servico.duracao}}' },
                { label: 'Preço', value: '{{servico.preco}}' },
            ]
        });
    }

    if (config.bankAccounts) {
        categories.push({
            category: 'Conta Bancária',
            items: [
                { label: 'Código (ID)', value: '{{conta_bancaria.id}}' },
                { label: 'Descrição', value: '{{conta_bancaria.descricao}}' },
                { label: 'Tipo de Conta', value: '{{conta_bancaria.tipo}}' },
                { label: 'Nome do Banco', value: '{{conta_bancaria.banco}}' },
                { label: 'Agência', value: '{{conta_bancaria.agencia}}' },
                { label: 'Nº da Conta', value: '{{conta_bancaria.numero_conta}}' },
                { label: 'Saldo Inicial', value: '{{conta_bancaria.saldo_inicial}}' },
                { label: 'Saldo Atual', value: '{{conta_bancaria.saldo_atual}}' },
                { label: 'Status', value: '{{conta_bancaria.status}}' },
            ]
        });
    }

    if (config.documentTypes) {
        categories.push({
            category: 'Tipo de Documento',
            items: [
                { label: 'Código (ID)', value: '{{tipo_documento.id}}' },
                { label: 'Descrição', value: '{{tipo_documento.descricao}}' },
                { label: 'Categoria', value: '{{tipo_documento.categoria}}' },
                { label: 'É Fiscal?', value: '{{tipo_documento.fiscal}}' },
                { label: 'Status', value: '{{tipo_documento.status}}' },
            ]
        });
    }

    if (config.bearers) {
        categories.push({
            category: 'Portador',
            items: [
                { label: 'Código (ID)', value: '{{portador.id}}' },
                { label: 'Código', value: '{{portador.codigo}}' },
                { label: 'Nome', value: '{{portador.nome}}' },
                { label: 'Tipo', value: '{{portador.tipo}}' },
                { label: 'Status', value: '{{portador.status}}' },
            ]
        });
    }

    if (config.chartOfAccounts) {
        categories.push({
            category: 'Plano de Contas',
            items: [
                { label: 'Código (ID)', value: '{{plano_contas.id}}' },
                { label: 'Código', value: '{{plano_contas.codigo}}' },
                { label: 'Nome', value: '{{plano_contas.nome}}' },
                { label: 'Tipo', value: '{{plano_contas.tipo}}' },
                { label: 'É Analítica?', value: '{{plano_contas.analitica}}' },
            ]
        });
    }

    if (config.departments) {
        categories.push({
            category: 'Departamento',
            items: [
                { label: 'Código (ID)', value: '{{departamento.id}}' },
                { label: 'Código', value: '{{departamento.codigo}}' },
                { label: 'Nome', value: '{{departamento.nome}}' },
                { label: 'Gerente', value: '{{departamento.gerente}}' },
                { label: 'Status', value: '{{departamento.status}}' },
            ]
        });
    }

    if (config.series) {
        categories.push({
            category: 'Série',
            items: [
                { label: 'Código (ID)', value: '{{serie.id}}' },
                { label: 'Sigla', value: '{{serie.sigla}}' },
                { label: 'Descrição', value: '{{serie.descricao}}' },
            ]
        });
    }

    categories.push({
        category: 'Processo Jurídico',
        items: [
            { label: 'Número do Processo', value: '{{processo.numero}}' },
            { label: 'Vara', value: '{{processo.vara}}' },
            { label: 'Comarca / Jurisdição', value: '{{processo.comarca}}' },
            { label: 'Tipo', value: '{{processo.tipo}}' },
            { label: 'Papel (Autor/Réu)', value: '{{processo.papel}}' },
            { label: 'Status', value: '{{processo.status}}' },
            { label: 'Assunto', value: '{{processo.assunto}}' },
            { label: 'Valor da Causa', value: '{{processo.valor_causa}}' },
            { label: 'Valor Provisionado', value: '{{processo.valor_provisionado}}' },
            { label: 'Nível de Risco', value: '{{processo.risco}}' },
            { label: 'Data de Distribuição', value: '{{processo.data_distribuicao}}' },
            { label: 'Parte Adversa', value: '{{processo.parte_adversa}}' },
            { label: 'Documento da Parte Adversa', value: '{{processo.documento_adversa}}' },
            { label: 'Advogado Adverso', value: '{{processo.advogado_adverso}}' },
            { label: 'OAB do Adverso', value: '{{processo.oab_adverso}}' },
            { label: 'Advogado Responsável', value: '{{processo.advogado_responsavel}}' },
        ]
    });

    categories.push({
        category: 'Geral (Sistema)',
        items: [
            { label: 'Data Atual (DD/MM/AAAA)', value: '{{data.hoje}}' },
            { label: 'Data por Extenso', value: '{{data.extenso}}' },
            { label: 'Dia da Semana', value: '{{data.dia_semana}}' },
            { label: 'Mês Atual', value: '{{data.mes}}' },
            { label: 'Ano Atual', value: '{{data.ano}}' },
            { label: 'Hora Atual', value: '{{hora.atual}}' },
            { label: 'Usuário Logado', value: '{{usuario.nome}}' },
        ]
    });

    return categories;
}

type ViewMode = 'LIST' | 'EDITOR';

function mapApiRowToFormTemplate(r: any): FormTemplate {
    return {
        id: r.id,
        name: r.name,
        description: r.description || '',
        content: r.content || '',
        header: r.header || '',
        footer: r.footer || '',
        menuIds: r.menu_ids || r.menuIds || [],
        docxTemplate: r.docx_template || r.docxTemplate || undefined,
        updatedAt: r.updated_at || r.updatedAt || '',
    };
}

const FormsBuilder: React.FC<FormsBuilderProps> = ({ config, onRefresh }) => {
  const { addToast, temPermissao } = useSecurity();
  const canViewForms = temPermissao('rel_formularios:VISUALIZAR' as any);
  const canCreateForms = temPermissao('rel_formularios:INCLUIR' as any);
  const canEditForms = temPermissao('rel_formularios:ALTERAR' as any);
  const canDeleteForms = temPermissao('rel_formularios:EXCLUIR' as any);
  const canPrintForms = temPermissao('rel_formularios:IMPRIMIR' as any);
  const { logTransaction } = useAudit();
  const { registerFormActions, unregisterFormActions } = useKeyboardShortcut();
  const { data: apiFormTemplates, refresh: refreshFormTemplates, loading: apiLoading, error: apiError } = useEntityCRUD<any>('form-templates', { pageSize: 500 });
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [forms, setForms] = useState<FormTemplate[]>(config.formTemplates || []);

  useEffect(() => {
      if (!apiLoading && !apiError) {
          setForms(apiFormTemplates.map(mapApiRowToFormTemplate));
      }
  }, [apiFormTemplates, apiLoading, apiError]);
  
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [formMenuIds, setFormMenuIds] = useState<string[]>([]);
  const [docxTemplateBase64, setDocxTemplateBase64] = useState<string | undefined>(undefined);

  type SidebarTab = 'VARIABLES' | 'MENUS';
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('VARIABLES');

  type ActiveSection = 'HEADER' | 'BODY' | 'FOOTER';
  const [activeSection, setActiveSection] = useState<ActiveSection>('BODY');

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const bodyEditorRef = useRef<TinyMCEEditor | null>(null);
  const headerEditorRef = useRef<TinyMCEEditor | null>(null);
  const footerEditorRef = useRef<TinyMCEEditor | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const availableVariables = useMemo(() => generateDynamicVariables(config), [config]);

  const activeVariablePrefixes = useMemo(() => {
      if (formMenuIds.length === 0) return null;
      const selectedContexts = FORM_CONTEXT_REGISTRY.filter(ctx => formMenuIds.includes(ctx.menuId));
      if (selectedContexts.length === 0) return null;
      const allPrefixes = new Set<string>();
      selectedContexts.forEach(ctx => ctx.availableVariablePrefixes.forEach(p => allPrefixes.add(p)));
      return allPrefixes;
  }, [formMenuIds]);

  const printStyles = `
    @media print {
        @page { margin: 0; }
        body { background: white; }
        .no-print { display: none !important; }
        .tox { display: none !important; }
        
        .print-header-fixed {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 10mm 20mm 5mm 20mm;
            background: white;
            z-index: 1000;
            height: 30mm;
            overflow: hidden;
            text-align: inherit;
        }
        
        .print-footer-fixed {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 5mm 20mm 10mm 20mm;
            background: white;
            z-index: 1000;
            height: 20mm;
            overflow: hidden;
            text-align: inherit;
        }

        .print-body-content {
            width: 100%;
            padding-top: 35mm;
            padding-bottom: 25mm;
            padding-left: 20mm;
            padding-right: 20mm;
        }
    }
  `;

  const handleEnterPress = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        const form = e.currentTarget.closest('div[data-form-container="true"]');
        if (!form) return;

        const focusableElements = form.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([type="button"]):not([tabindex="-1"])'
        );
        
        const focusableArray = Array.from(focusableElements) as HTMLElement[];
        const index = focusableArray.indexOf(e.currentTarget as HTMLElement);
        
        if (index > -1 && index < focusableArray.length - 1) {
            focusableArray[index + 1].focus();
        }
    }
  };

  const handleInsertVariable = (variable: string) => {
      switch (activeSection) {
          case 'HEADER':
              headerEditorRef.current?.focus();
              headerEditorRef.current?.insertContent(variable);
              break;
          case 'FOOTER':
              footerEditorRef.current?.focus();
              footerEditorRef.current?.insertContent(variable);
              break;
          default:
              bodyEditorRef.current?.focus();
              bodyEditorRef.current?.insertContent(variable);
              break;
      }
  };

  const postProcessDocxHtml = (html: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      doc.querySelectorAll('table').forEach(table => {
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          table.style.fontFamily = 'Arial, sans-serif';
          table.style.fontSize = '11px';
          table.style.marginBottom = '12px';
          table.setAttribute('cellpadding', '0');
          table.setAttribute('cellspacing', '0');
      });

      doc.querySelectorAll('td, th').forEach(cell => {
          const el = cell as HTMLElement;
          el.style.padding = '6px';
          el.style.border = '1px solid #ccc';
          el.style.verticalAlign = 'top';
      });

      doc.querySelectorAll('th').forEach(th => {
          const el = th as HTMLElement;
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = '#f0f0f0';
          el.style.textAlign = 'left';
      });

      doc.querySelectorAll('img').forEach(img => {
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '4px 0';
      });

      doc.querySelectorAll('p').forEach(p => {
          if (!p.style.marginBottom) {
              p.style.marginBottom = '4px';
          }
          if (!p.style.lineHeight) {
              p.style.lineHeight = '1.4';
          }
      });

      doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
          const el = heading as HTMLElement;
          el.style.marginTop = '12px';
          el.style.marginBottom = '6px';
          el.style.fontWeight = 'bold';
      });

      return doc.body.innerHTML;
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
          alert('O formato .doc (Word 97-2003) não é suportado.\n\nPor favor, abra o arquivo no Word e salve como .docx (Arquivo → Salvar Como → Documento do Word .docx).');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      if (!fileName.endsWith('.docx')) {
          alert('Por favor, selecione um arquivo .docx válido.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      const maxDocxBytes = 10 * 1024 * 1024;
      if (file.size > maxDocxBytes) {
          alert('O arquivo .docx excede o limite de 10 MB.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      setIsImporting(true);
      try {
          const arrayBuffer = await file.arrayBuffer();

          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
          }
          const mammoth = (await import('mammoth')).default;
          const result = await mammoth.convertToHtml(
              { arrayBuffer },
              {
                  convertImage: mammoth.images.imgElement(function() {
                      return Promise.resolve({ src: '' });
                  }),
                  styleMap: [
                      "p[style-name='Title'] => h1:fresh",
                      "p[style-name='Heading 1'] => h1:fresh",
                      "p[style-name='Heading 2'] => h2:fresh",
                      "p[style-name='Heading 3'] => h3:fresh",
                      "p[style-name='Subtitle'] => h2:fresh",
                      "b => b",
                      "i => i",
                      "u => u",
                      "strike => s",
                  ]
              }
          );

          let cleanHtml = result.value.replace(/<img[^>]*src=["']['""][^>]*\/?>/gi, '');
          const styledHtml = postProcessDocxHtml(cleanHtml);

          setDocxTemplateBase64(btoa(binary));
          if (bodyEditorRef.current) {
              bodyEditorRef.current.setContent(styledHtml);
          }
          setActiveSection('BODY');

          if (result.messages && result.messages.length > 0) {
              console.warn('Avisos na conversão DOCX:', result.messages);
          }

          if (!formName) {
              const nameWithoutExt = file.name.replace(/\.docx$/i, '');
              setFormName(nameWithoutExt);
          }

          addToast('success', 'Importado', 'Documento .docx importado com sucesso! Insira imagens manualmente pelo editor.');
      } catch (err) {
          console.error('Erro ao importar DOCX:', err);
          alert('Erro ao importar o arquivo. Verifique se é um arquivo .docx válido e tente novamente.');
      } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleOpenEditor = (form?: FormTemplate) => {
      if (form ? !canEditForms : !canCreateForms) {
          addToast('error', 'Acesso negado', 'Você não tem permissão para editar ou criar formulários.');
          return;
      }
      if (form) {
          setCurrentFormId(form.id);
          setFormName(form.name);
          setFormDesc(form.description);
          setHeaderHtml(form.header || '');
          setFooterHtml(form.footer || '');
          setBodyHtml(form.content || '');
          setFormMenuIds(form.menuIds || []);
          setDocxTemplateBase64(form.docxTemplate);
          const hasHeader = !!(form.header && form.header.trim());
          const hasFooter = !!(form.footer && form.footer.trim());
          setShowHeader(hasHeader);
          setShowFooter(hasFooter);
          setTimeout(() => {
              bodyEditorRef.current?.setContent(form.content || '');
              if (hasHeader) headerEditorRef.current?.setContent(form.header || '');
              if (hasFooter) footerEditorRef.current?.setContent(form.footer || '');
          }, 100);
      } else {
          setCurrentFormId(null);
          setFormName('');
          setFormDesc('');
          setHeaderHtml('');
          setFooterHtml('');
          setBodyHtml('<p>Comece a digitar...</p>');
          setShowHeader(false);
          setShowFooter(false);
          setFormMenuIds([]);
          setDocxTemplateBase64(undefined);
          setTimeout(() => {
              bodyEditorRef.current?.setContent('<p>Comece a digitar...</p>');
          }, 100);
      }
      setSidebarTab('VARIABLES');
      setViewMode('EDITOR');
  };

  const handleSave = async () => {
      if (currentFormId ? !canEditForms : !canCreateForms) {
          addToast('error', 'Acesso negado', 'Você não tem permissão para salvar este formulário.');
          return;
      }
      if (!formName) {
          addToast('warning', 'Validação', 'Informe o nome do formulário.');
          return;
      }
      setIsSaving(true);

      const content = bodyEditorRef.current?.getContent() ?? bodyHtml;
      const header = showHeader ? (headerEditorRef.current?.getContent() ?? headerHtml) : headerHtml;
      const footer = showFooter ? (footerEditorRef.current?.getContent() ?? footerHtml) : footerHtml;

      const previousForms = forms;
      try {
          const payload = {
              name: formName,
              description: formDesc,
              content: content,
              header: header,
              footer: footer,
              menu_ids: formMenuIds,
              docx_template: docxTemplateBase64,
          };
          let savedForm: any;
          if (currentFormId) {
              const result = await api.put<{ data: any }>(`/api/form-templates/${currentFormId}`, payload);
              savedForm = result.data;
          } else {
              const result = await api.post<{ data: any }>('/api/form-templates', payload);
              savedForm = result.data;
          }
          const saved = mapApiRowToFormTemplate(savedForm);
          setForms(currentFormId
              ? previousForms.map(form => form.id === currentFormId ? saved : form)
              : [saved, ...previousForms]);
          logTransaction('FORMULARIO', saved.id, currentFormId ? previousForms.find(f => f.id === currentFormId) || null : null, saved);
          await refreshFormTemplates();
          onRefresh?.();
          addToast('success', 'Salvo', 'Formulário salvo com sucesso!');
          setViewMode('LIST');
      } catch (err: any) {
          console.error('API form-templates save error:', err);
          const detail = err?.message || err?.details || 'Verifique os dados e tente novamente.';
          addToast('error', 'Erro ao salvar', detail);
      } finally {
          setIsSaving(false);
      }
  };

  useEffect(() => {
      if (viewMode === 'EDITOR') {
          registerFormActions(handleSave, () => setViewMode('LIST'));
      } else {
          unregisterFormActions();
      }
      return () => unregisterFormActions();
  }, [viewMode]);

  const handleDelete = async (id: string) => {
      if (!canDeleteForms) {
          addToast('error', 'Acesso negado', 'Você não tem permissão para excluir formulários.');
          return;
      }
      if(window.confirm('Excluir este formulário?')) {
          const toDelete = forms.find(f => f.id === id);
          try {
              await api.delete(`/api/form-templates/${id}`);
              if (toDelete) logTransaction('FORMULARIO', id, toDelete, null);
              setForms(prev => prev.filter(form => form.id !== id));
              await refreshFormTemplates();
              onRefresh?.();
              addToast('success', 'Excluído', 'Formulário removido.');
          } catch (err) {
              console.error('API form-templates delete error:', err);
              addToast('error', 'Erro ao excluir', err instanceof Error ? err.message : 'Verifique sua permissão e tente novamente.');
          }
      }
  };

  const toggleCategory = (category: string) => {
      setExpandedCategories(prev => {
          const next = new Set(prev);
          if (next.has(category)) {
              next.delete(category);
          } else {
              next.add(category);
          }
          return next;
      });
  };

  const handlePrint = () => {
      if (!canPrintForms) {
          addToast('error', 'Acesso negado', 'Você não tem permissão para imprimir formulários.');
          return;
      }
      const bodyContent = bodyEditorRef.current?.getContent() || '';
      const headerContent = headerEditorRef.current?.getContent() || '';
      const footerContent = footerEditorRef.current?.getContent() || '';

      openPrintWindow(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>${formName || 'Formulário'}</title>
              <style>
                  @page { margin: 0; }
                  body { margin: 0; padding: 0; font-family: "Times New Roman", serif; font-size: 16px; line-height: 1.5; }
                  .print-header { position: fixed; top: 0; left: 0; width: 100%; padding: 10mm 20mm 5mm 20mm; background: white; height: 30mm; overflow: hidden; box-sizing: border-box; }
                  .print-footer { position: fixed; bottom: 0; left: 0; width: 100%; padding: 5mm 20mm 10mm 20mm; background: white; height: 20mm; overflow: hidden; box-sizing: border-box; }
                  .print-body { padding: 35mm 20mm 25mm 20mm; }
                  img { max-width: 100%; }
                  img.img-behind-text { position: absolute; z-index: -1; opacity: 0.9; }
                  img.img-front-text { position: relative; z-index: 10; }
                  img.img-float-left { float: left; margin: 4px 12px 4px 0; }
                  img.img-float-right { float: right; margin: 4px 0 4px 12px; }
                  img.img-center { display: block; margin: 8px auto; }
                  table { border-collapse: collapse; }
                  td, th { border: 1px solid #ccc; padding: 4px 8px; }
              </style>
          </head>
          <body>
              <div class="print-header">${headerContent}</div>
              <div class="print-footer">${footerContent}</div>
              <div class="print-body">${bodyContent}</div>
              <script>window.onload = function() { window.print(); window.close(); }<\/script>
          </body>
          </html>
      `);
  };

  const tinyMCEBaseInit = {
      skin_url: '/tinymce-skins/ui/oxide',
      content_css: '/tinymce-skins/content/default/content.min.css',
      menubar: false,
      statusbar: false,
      resize: false,
      promotion: false,
      branding: false,
      image_advtab: true,
      image_caption: true,
      image_title: true,
      image_description: true,
      image_class_list: [
          { title: 'Normal', value: '' },
          { title: 'Atrás do Texto', value: 'img-behind-text' },
          { title: 'Na Frente do Texto', value: 'img-front-text' },
          { title: 'Flutuando à Esquerda', value: 'img-float-left' },
          { title: 'Flutuando à Direita', value: 'img-float-right' },
          { title: 'Centralizado', value: 'img-center' },
      ],
  };

  if (!canViewForms) {
      return (
          <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
              Você não tem permissão para visualizar e gerenciar modelos de formulário.
          </div>
      );
  }

  if (viewMode === 'LIST') {
      return (
           <div className="flex flex-col h-full min-w-0 animate-fade-in">
               <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
                   <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Gerenciador de Formulários</h2>
                   {canCreateForms && (
                       <Button variant="new" className="!w-auto" onClick={() => handleOpenEditor()}>
                           Novo Formulário
                       </Button>
                   )}
              </div>

               <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto flex-1" aria-label="Tabela de formulários com rolagem horizontal">
                   <table className="min-w-[760px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rotinas Vinculadas</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Atualização</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {apiLoading && forms.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                      Carregando formulários...
                                  </td>
                              </tr>
                          )}
                           {!apiLoading && apiError && (
                               <tr>
                                   <td colSpan={5} className="px-6 py-10 text-center text-red-700" role="alert">
                                       Não foi possível carregar os formulários: {apiError}
                                   </td>
                               </tr>
                           )}
                           {!apiLoading && !apiError && forms.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                      Nenhum formulário encontrado.
                                  </td>
                              </tr>
                          )}
                          {!apiLoading && !apiError && forms.map(form => {
                              const linkedContexts = FORM_CONTEXT_REGISTRY.filter(ctx => form.menuIds?.includes(ctx.menuId));
                              return (
                                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.name}</td>
                                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{form.description}</td>
                                      <td className="px-6 py-4">
                                          {linkedContexts.length === 0 ? (
                                              <span className="text-xs text-gray-400 italic">Nenhuma</span>
                                          ) : (
                                              <div className="flex flex-wrap gap-1">
                                                  {linkedContexts.map(ctx => (
                                                      <span key={ctx.menuId} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                                          {ctx.label}
                                                          {ctx.targetTypes.map(t => (
                                                              <span key={t} className={`text-[9px] px-1 py-0 rounded-full font-bold ${t === 'grid' ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'}`}>
                                                                  {t === 'grid' ? 'G' : 'M'}
                                                              </span>
                                                          ))}
                                                      </span>
                                                  ))}
                                              </div>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{form.updatedAt ? (() => { const d = new Date(form.updatedAt); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR'); })() : '—'}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          {canEditForms && <button onClick={() => handleOpenEditor(form)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>}
                                          {canDeleteForms && <button onClick={() => handleDelete(form.id)} className="text-red-600 hover:text-red-900">Excluir</button>}
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  return (
     <div className="flex flex-col h-full min-w-0 animate-fade-in relative">
        <style>{printStyles}</style>

        <div className="flex flex-wrap gap-3 justify-between items-center mb-4 no-print bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Button variant="ghost" className="!w-auto !p-2" onClick={() => setViewMode('LIST')} title="Voltar">
                    ⬅️
                </Button>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Editor</h2>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500 border border-gray-200">A4</span>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
                {(currentFormId ? canEditForms : canCreateForms) && <Button variant="primary" className="!w-auto !py-2 !px-4 !text-sm" onClick={handleSave} isLoading={isSaving}>Salvar</Button>}
                <Button variant="outline" className="!w-auto !py-2 !px-4 !text-sm border-red-200 text-red-600 hover:bg-red-50" onClick={() => setViewMode('LIST')}>Cancelar</Button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                {canPrintForms && <Button variant="secondary" className="!w-auto !py-2 !px-3 !text-xs" onClick={handlePrint} title="Imprimir">🖨️ Imprimir</Button>}
                {(currentFormId ? canEditForms : canCreateForms) && <Button
                    variant="secondary"
                    className="!w-auto !py-2 !px-3 !text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isImporting}
                    title="Importar arquivo .docx"
                >
                    📄 Importar DOCX
                </Button>}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".doc,.docx"
                    className="hidden"
                    onChange={handleImportDocx}
                />
            </div>
        </div>

        <div className="mb-4 no-print flex flex-col sm:flex-row gap-4" data-form-container="true">
            <div className="flex-1">
                <Input label="Nome do Formulário" value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-white" containerClassName="!mb-0" onKeyDown={handleEnterPress} />
            </div>
            <div className="flex-1">
                <Input label="Descrição Curta" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="bg-white" containerClassName="!mb-0" onKeyDown={handleEnterPress} />
            </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 gap-4 overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col bg-gray-200 rounded-lg shadow-inner border border-gray-300 relative overflow-hidden">
                <div className="flex-1 overflow-auto p-3 sm:p-8 flex justify-start sm:justify-center bg-gray-200" aria-label="Editor A4 com rolagem">
                    <div className="w-[210mm] bg-white shadow-lg flex flex-col" style={{ minHeight: '297mm' }}>
                        {showHeader ? (
                            <div
                                className={`relative border-b-2 border-dashed transition-colors ${activeSection === 'HEADER' ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}
                                onClick={() => setActiveSection('HEADER')}
                            >
                                <div className="absolute top-1 left-3 z-10 flex items-center gap-1.5">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${activeSection === 'HEADER' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        Cabeçalho
                                    </span>
                                    <button
                                        className="text-[9px] text-gray-400 hover:text-red-500 transition-colors px-1"
                                        onClick={(e) => { e.stopPropagation(); setShowHeader(false); setActiveSection('BODY'); }}
                                        title="Ocultar cabeçalho"
                                    >✕</button>
                                </div>
                                <div className="pt-5">
                                    <Editor
                                        onInit={(_evt, editor) => { headerEditorRef.current = editor; }}
                                        licenseKey="gpl"
                                        initialValue={headerHtml}
                                        onEditorChange={(content) => setHeaderHtml(content)}
                                        onFocus={() => setActiveSection('HEADER')}
                                        init={{
                                            ...tinyMCEBaseInit,
                                            plugins: 'lists image link',
                                            toolbar: 'bold italic underline | forecolor backcolor | alignleft aligncenter alignright | fontsize | image',
                                            height: 120,
                                            content_style: 'body { font-family: "Times New Roman", serif; font-size: 14px; line-height: 1.4; margin: 0; padding: 8px 20mm; } img { max-width: 100%; } img.img-behind-text { position: absolute; z-index: -1; opacity: 0.9; } img.img-front-text { position: relative; z-index: 10; } img.img-float-left { float: left; margin: 4px 12px 4px 0; } img.img-float-right { float: right; margin: 4px 0 4px 12px; } img.img-center { display: block; margin: 8px auto; }',
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-1 border-b border-dashed border-gray-200 bg-gray-50/50">
                                <button
                                    className="text-[10px] text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 px-3 py-0.5 rounded hover:bg-blue-50"
                                    onClick={() => { setShowHeader(true); setActiveSection('HEADER'); }}
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                    Cabeçalho
                                </button>
                            </div>
                        )}

                        <div
                            className={`flex-1 relative transition-colors ${activeSection === 'BODY' ? 'bg-white' : ''}`}
                            onClick={() => setActiveSection('BODY')}
                        >
                            {(showHeader || showFooter) && (
                                <div className="absolute top-1 left-3 z-10">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${activeSection === 'BODY' ? 'bg-moss-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        Corpo
                                    </span>
                                </div>
                            )}
                            <div className={showHeader || showFooter ? 'pt-5' : ''}>
                                <Editor
                                    onInit={(_evt, editor) => { bodyEditorRef.current = editor; }}
                                    licenseKey="gpl"
                                    initialValue={bodyHtml}
                                    onFocus={() => setActiveSection('BODY')}
                                    init={{
                                        ...tinyMCEBaseInit,
                                        plugins: 'lists table image link code pagebreak',
                                        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table image imageposition link | pagebreak | code',
                                        min_height: 600,
                                        autoresize_bottom_margin: 50,
                                        statusbar: true,
                                        object_resizing: true,
                                        content_style: `
                                            body { font-family: "Times New Roman", serif; font-size: 16px; line-height: 1.5; margin: 0; padding: 10mm 20mm; }
                                            img { max-width: 100%; cursor: move; }
                                            img.img-behind-text { position: absolute; z-index: -1; opacity: 0.9; pointer-events: auto; }
                                            img.img-front-text { position: relative; z-index: 10; }
                                            img.img-float-left { float: left; margin: 4px 12px 4px 0; }
                                            img.img-float-right { float: right; margin: 4px 0 4px 12px; }
                                            img.img-center { display: block; margin: 8px auto; }
                                        `,
                                        setup: (editor: any) => {
                                            editor.on('ObjectResized', (e: any) => {
                                                if (e.target.nodeName === 'IMG') {
                                                    e.target.style.width = e.width + 'px';
                                                    e.target.style.height = e.height + 'px';
                                                }
                                            });
                                            editor.ui.registry.addMenuButton('imageposition', {
                                                icon: 'image',
                                                tooltip: 'Posição da Imagem',
                                                fetch: (callback: any) => {
                                                    const node = editor.selection.getNode();
                                                    if (node.nodeName !== 'IMG') {
                                                        callback([{ type: 'menuitem', text: 'Selecione uma imagem primeiro', enabled: false, onAction: () => {} }]);
                                                        return;
                                                    }
                                                    callback([
                                                        { type: 'menuitem', text: 'Normal (inline)', onAction: () => { node.className = ''; node.style.position = ''; node.style.float = ''; node.style.zIndex = ''; node.style.margin = ''; node.style.display = ''; } },
                                                        { type: 'menuitem', text: 'Atrás do Texto', onAction: () => { node.className = 'img-behind-text'; } },
                                                        { type: 'menuitem', text: 'Na Frente do Texto', onAction: () => { node.className = 'img-front-text'; } },
                                                        { type: 'menuitem', text: 'Flutuando à Esquerda', onAction: () => { node.className = 'img-float-left'; } },
                                                        { type: 'menuitem', text: 'Flutuando à Direita', onAction: () => { node.className = 'img-float-right'; } },
                                                        { type: 'menuitem', text: 'Centralizado', onAction: () => { node.className = 'img-center'; } },
                                                        { type: 'separator' },
                                                        { type: 'menuitem', text: 'Mover para Cima', onAction: () => { const mt = parseInt(node.style.marginTop || '0'); node.style.marginTop = (mt - 5) + 'px'; } },
                                                        { type: 'menuitem', text: 'Mover para Baixo', onAction: () => { const mt = parseInt(node.style.marginTop || '0'); node.style.marginTop = (mt + 5) + 'px'; } },
                                                        { type: 'menuitem', text: 'Mover para Esquerda', onAction: () => { const ml = parseInt(node.style.marginLeft || '0'); node.style.marginLeft = (ml - 5) + 'px'; } },
                                                        { type: 'menuitem', text: 'Mover para Direita', onAction: () => { const ml = parseInt(node.style.marginLeft || '0'); node.style.marginLeft = (ml + 5) + 'px'; } },
                                                    ]);
                                                }
                                            });
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {showFooter ? (
                            <div
                                className={`relative border-t-2 border-dashed transition-colors ${activeSection === 'FOOTER' ? 'border-amber-400 bg-amber-50/30' : 'border-gray-200'}`}
                                onClick={() => setActiveSection('FOOTER')}
                            >
                                <div className="absolute top-1 left-3 z-10 flex items-center gap-1.5">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${activeSection === 'FOOTER' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        Rodapé
                                    </span>
                                    <button
                                        className="text-[9px] text-gray-400 hover:text-red-500 transition-colors px-1"
                                        onClick={(e) => { e.stopPropagation(); setShowFooter(false); setActiveSection('BODY'); }}
                                        title="Ocultar rodapé"
                                    >✕</button>
                                </div>
                                <div className="pt-5">
                                    <Editor
                                        onInit={(_evt, editor) => { footerEditorRef.current = editor; }}
                                        licenseKey="gpl"
                                        initialValue={footerHtml}
                                        onEditorChange={(content) => setFooterHtml(content)}
                                        onFocus={() => setActiveSection('FOOTER')}
                                        init={{
                                            ...tinyMCEBaseInit,
                                            plugins: 'lists image link',
                                            toolbar: 'bold italic underline | forecolor backcolor | alignleft aligncenter alignright | fontsize | image',
                                            height: 100,
                                            content_style: 'body { font-family: "Times New Roman", serif; font-size: 12px; line-height: 1.4; margin: 0; padding: 8px 20mm; } img { max-width: 100%; } img.img-behind-text { position: absolute; z-index: -1; opacity: 0.9; } img.img-front-text { position: relative; z-index: 10; } img.img-float-left { float: left; margin: 4px 12px 4px 0; } img.img-float-right { float: right; margin: 4px 0 4px 12px; } img.img-center { display: block; margin: 8px auto; }',
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-1 border-t border-dashed border-gray-200 bg-gray-50/50">
                                <button
                                    className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors flex items-center gap-1 px-3 py-0.5 rounded hover:bg-amber-50"
                                    onClick={() => { setShowFooter(true); setActiveSection('FOOTER'); }}
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                    Rodapé
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {sidebarOpen ? (
            <div className="w-full lg:w-72 lg:flex-shrink-0 max-h-[45vh] lg:max-h-none bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col no-print relative">
                <div className="flex border-b border-gray-300 bg-gray-50 rounded-t-lg overflow-hidden">
                    <button
                        className={`flex-1 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${sidebarTab === 'VARIABLES' ? 'bg-white text-moss-700 border-b-2 border-moss-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setSidebarTab('VARIABLES')}
                    >
                        Variáveis
                    </button>
                    <button
                        className={`flex-1 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${sidebarTab === 'MENUS' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setSidebarTab('MENUS')}
                    >
                        Rotinas
                    </button>
                    <button
                        className="px-2 py-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors border-l border-gray-200"
                        onClick={() => setSidebarOpen(false)}
                        title="Recolher painel"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                </div>

                {sidebarTab === 'VARIABLES' && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-[11px] text-gray-400">Inserir em:</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                activeSection === 'HEADER' ? 'bg-blue-100 text-blue-700' :
                                activeSection === 'FOOTER' ? 'bg-amber-100 text-amber-700' :
                                'bg-moss-100 text-moss-700'
                            }`}>
                                {activeSection === 'HEADER' ? 'Cabeçalho' : activeSection === 'FOOTER' ? 'Rodapé' : 'Corpo'}
                            </span>
                        </div>
                        {activeVariablePrefixes && (
                            <div className="px-1 mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
                                Variáveis filtradas pelas rotinas selecionadas. Grupos inativos estão indicados.
                            </div>
                        )}
                        {availableVariables.map((group, idx) => {
                            const isExpanded = expandedCategories.has(group.category);
                            const categoryPrefix = group.items[0]?.value.match(/\{\{(\w+)\./)?.[1] || '';
                            const isActive = !activeVariablePrefixes || activeVariablePrefixes.has(categoryPrefix) || activeVariablePrefixes.has('geral');
                            return (
                                <div key={idx} className={isActive ? '' : 'opacity-40'}>
                                    <button
                                        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-100 transition-colors text-left"
                                        onClick={() => toggleCategory(group.category)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-bold text-sm ${isActive ? 'text-moss-700' : 'text-gray-400'}`}>{group.category}</h4>
                                            {!isActive && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-full uppercase font-bold">inativo</span>
                                            )}
                                        </div>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </button>
                                    {isExpanded && (
                                        <div className="space-y-1 mt-1 mb-2">
                                            {group.items.map((item, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => isActive ? handleInsertVariable(item.value) : undefined}
                                                    disabled={!isActive}
                                                    className={`w-full text-left px-3 py-1.5 border rounded text-xs font-medium transition-all flex justify-between items-center group ${isActive ? 'bg-gray-50 border-gray-200 hover:bg-moss-50 hover:border-moss-200 hover:text-moss-800 cursor-pointer' : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                    title={isActive ? `Inserir: ${item.value}` : 'Esta variável não está disponível nas rotinas selecionadas'}
                                                >
                                                    <span>{item.label}</span>
                                                    <span className="text-[10px] text-gray-400 group-hover:text-moss-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {item.value}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {sidebarTab === 'MENUS' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-emerald-100 bg-emerald-50/40">
                            <p className="text-xs text-emerald-700 font-medium">Selecione em quais rotinas este formulário estará disponível. Os badges indicam onde o botão aparece (grid / modal).</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-3">
                            {(() => {
                                const groupedByModule = FORM_CONTEXT_REGISTRY.reduce<Record<string, typeof FORM_CONTEXT_REGISTRY>>((acc, ctx) => {
                                    if (!acc[ctx.module]) acc[ctx.module] = [];
                                    acc[ctx.module].push(ctx);
                                    return acc;
                                }, {});
                                return Object.entries(groupedByModule).map(([moduleName, ctxList]) => (
                                    <div key={moduleName}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-1">{moduleName}</p>
                                        <div className="space-y-1">
                                            {ctxList.map(ctx => {
                                                const isSelected = formMenuIds.includes(ctx.menuId);
                                                return (
                                                    <div
                                                        key={ctx.menuId}
                                                        className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
                                                        onClick={() => {
                                                            setFormMenuIds(prev =>
                                                                prev.includes(ctx.menuId)
                                                                    ? prev.filter(id => id !== ctx.menuId)
                                                                    : [...prev, ctx.menuId]
                                                            );
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>{ctx.label}</p>
                                                            {ctx.description && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ctx.description}</p>
                                                            )}
                                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                                {ctx.targetTypes.map(t => (
                                                                    <span key={t} className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${t === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                        {t === 'grid' ? 'Grid' : 'Modal'}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                        <div className="p-2 border-t border-gray-200 bg-gray-50">
                            <p className="text-[10px] text-gray-400 text-center">{formMenuIds.filter(id => FORM_CONTEXT_REGISTRY.some(c => c.menuId === id)).length} de {FORM_CONTEXT_REGISTRY.length} rotinas selecionadas</p>
                        </div>
                    </div>
                )}
            </div>
            ) : (
            <div className="w-10 bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col items-center no-print">
                <button
                    className="w-full py-3 text-gray-400 hover:text-moss-700 hover:bg-gray-100 transition-colors rounded-t-lg"
                    onClick={() => setSidebarOpen(true)}
                    title="Expandir painel"
                >
                    <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="w-px h-4 bg-gray-200"></div>
                <button
                    className="w-full py-2 text-gray-400 hover:text-moss-700 hover:bg-gray-100 transition-colors"
                    onClick={() => { setSidebarOpen(true); setSidebarTab('VARIABLES'); }}
                    title="Variáveis"
                >
                    <span className="text-[9px] font-bold">Var</span>
                </button>
                <button
                    className="w-full py-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-100 transition-colors rounded-b-lg"
                    onClick={() => { setSidebarOpen(true); setSidebarTab('MENUS'); }}
                    title="Rotinas"
                >
                    <span className="text-[9px] font-bold">Rot</span>
                </button>
            </div>
            )}
        </div>
    </div>
  );
};

export default FormsBuilder;
