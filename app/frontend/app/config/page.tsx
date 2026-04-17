"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProductOut, ConsultantOut } from "@/lib/types";

const PRODUCT_TYPES = [
  "SaaS LMS",
  "SaaS Skills",
  "SaaS Author",
  "SaaS Engage",
  "SaaS AIO",
  "Author Online",
  "TaaS",
  "Implantacion",
  "Otro",
];

type ProductUpdateData = Partial<{
  product_name: string;
  product_code: string;
  product_type: string;
  category: string;
  subcategory: string;
  business_line: string;
}>;

function ProductRow({
  product,
  onSave,
}: {
  product: ProductOut;
  onSave: (id: number, data: ProductUpdateData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(product.product_type);
  const [line, setLine] = useState(product.business_line ?? "");

  function handleSave() {
    const data: ProductUpdateData = { product_type: type };
    if (line) data.business_line = line;
    onSave(product.id, data);
    setEditing(false);
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-2.5 text-gray-800 text-sm">
        {product.product_name}
        {!product.is_saas && (
          <span className="ml-2 text-xs text-gray-400">No SaaS</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm">
        {editing ? (
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          <span
            className={
              product.product_type === "[SIN ASIGNAR]"
                ? "text-amber-600 font-medium"
                : "text-gray-700"
            }
          >
            {product.product_type}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm">
        {editing ? (
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Ej: isEazy LMS"
          />
        ) : (
          <span className="text-gray-600">{product.business_line ?? "—"}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {product.is_saas ? "✅" : "❌"}
      </td>
      <td className="px-5 py-2.5 text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 hover:underline"
          >
            Editar
          </button>
        )}
      </td>
    </tr>
  );
}

function ConsultantRow({
  consultant,
  onSave,
}: {
  consultant: ConsultantOut;
  onSave: (id: number, data: Partial<ConsultantOut>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(consultant.consultant_name);
  const [country, setCountry] = useState(consultant.country);

  function handleSave() {
    onSave(consultant.id, { consultant_name: name, country });
    setEditing(false);
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-2.5">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        ) : (
          <span className="text-sm text-gray-800">{consultant.consultant_name}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        ) : (
          <span className="text-sm text-gray-600">{consultant.country}</span>
        )}
      </td>
      <td className="px-5 py-2.5 text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 hover:underline"
          >
            Editar
          </button>
        )}
      </td>
    </tr>
  );
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductType, setNewProductType] = useState(PRODUCT_TYPES[0]);

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });

  const { data: consultants, isLoading: loadingConsultants } = useQuery({
    queryKey: ["consultants-config"],
    queryFn: api.getConsultants,
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUpdateData }) =>
      api.updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const createProduct = useMutation({
    mutationFn: () =>
      api.createProduct({ product_name: newProductName, product_type: newProductType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setAddingProduct(false);
      setNewProductName("");
    },
  });

  const updateConsultant = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateConsultant>[1] }) =>
      api.updateConsultant(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultants-config"] }),
  });

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Products */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Clasificación de Productos</h2>
          <button
            onClick={() => setAddingProduct(true)}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            + Añadir producto
          </button>
        </div>

        {addingProduct && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
            <input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Nombre del producto…"
              className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={newProductType}
              onChange={(e) => setNewProductType(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={() => createProduct.mutate()}
              disabled={!newProductName || createProduct.isPending}
              className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={() => setAddingProduct(false)}
              className="text-sm px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">Nombre</th>
                <th className="text-left px-4 py-2.5">Tipo</th>
                <th className="text-left px-4 py-2.5">Línea</th>
                <th className="text-center px-4 py-2.5">SaaS</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingProducts && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {products?.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onSave={(id, data) => updateProduct.mutate({ id, data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consultants */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Consultores</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">Nombre</th>
                <th className="text-left px-4 py-2.5">País</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingConsultants && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {consultants?.map((c) => (
                <ConsultantRow
                  key={c.id}
                  consultant={c}
                  onSave={(id, data) => updateConsultant.mutate({ id, data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
