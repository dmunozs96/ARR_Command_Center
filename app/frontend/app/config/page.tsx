"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ConsultantOut, ProductOut } from "@/lib/types";

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
  highlight = false,
}: {
  product: ProductOut;
  onSave: (id: number, data: ProductUpdateData) => void;
  highlight?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(product.product_type);
  const [line, setLine] = useState(product.business_line ?? "");

  function handleSave() {
    const data: ProductUpdateData = { product_type: type, business_line: line || undefined };
    onSave(product.id, data);
    setEditing(false);
  }

  return (
    <tr className={highlight ? "bg-amber-50/70" : "hover:bg-stone-50"}>
      <td className="px-5 py-3 text-sm text-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          <span>{product.product_name}</span>
          {highlight && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
              Desde alerta
            </span>
          )}
          {!product.is_saas && <span className="text-xs text-stone-400">No SaaS</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {editing ? (
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
          >
            {PRODUCT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : (
          <span className={product.product_type === "[SIN ASIGNAR]" ? "font-medium text-amber-700" : "text-stone-700"}>
            {product.product_type}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {editing ? (
          <input
            value={line}
            onChange={(event) => setLine(event.target.value)}
            className="w-40 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            placeholder="Ej: isEazy LMS"
          />
        ) : (
          <span className="text-stone-600">{product.business_line ?? "-"}</span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-sm text-stone-700">
        {product.is_saas ? "Si" : "No"}
      </td>
      <td className="px-5 py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-800"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-100"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-amber-700 transition hover:text-amber-900"
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
    <tr className="hover:bg-stone-50">
      <td className="px-5 py-3">
        {editing ? (
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
          />
        ) : (
          <span className="text-sm text-stone-800">{consultant.consultant_name}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-28 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
          />
        ) : (
          <span className="text-sm text-stone-600">{consultant.country}</span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-800"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-100"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-amber-700 transition hover:text-amber-900"
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
  const searchParams = useSearchParams();
  const productFromAlert = searchParams.get("product") ?? "";
  const fromAlert = searchParams.get("fromAlert");

  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState(productFromAlert);
  const [newProductType, setNewProductType] = useState(PRODUCT_TYPES[0]);
  const [productSearch, setProductSearch] = useState(productFromAlert);

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });

  const { data: consultants, isLoading: loadingConsultants } = useQuery({
    queryKey: ["consultants-config"],
    queryFn: api.getConsultants,
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUpdateData }) => api.updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const createProduct = useMutation({
    mutationFn: () => api.createProduct({ product_name: newProductName, product_type: newProductType }),
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

  const filteredProducts = useMemo(() => {
    const items = products ?? [];
    const term = productSearch.trim().toLowerCase();
    if (!term) return items;
    return items.filter((product) => {
      const haystack = [
        product.product_name,
        product.product_code ?? "",
        product.product_type,
        product.business_line ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [productSearch, products]);

  const exactMatchExists = useMemo(
    () =>
      !!productFromAlert &&
      (products ?? []).some(
        (product) => product.product_name.trim().toLowerCase() === productFromAlert.trim().toLowerCase(),
      ),
    [productFromAlert, products],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Configuracion</h1>
            <p className="mt-1 text-sm text-stone-500">
              Clasifica productos y corrige dimensiones maestras sin salir del flujo de revision.
            </p>
          </div>
          <button
            onClick={() => setAddingProduct(true)}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            + Anadir producto
          </button>
        </div>

        {fromAlert && productFromAlert && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Llegaste desde una alerta de producto sin clasificar.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Producto objetivo: <span className="font-medium">{productFromAlert}</span>
              {exactMatchExists
                ? ". Ya puedes editar su tipo y linea de negocio."
                : ". No existe en la tabla maestra actual; puedes crearlo desde aqui."}
            </p>
          </div>
        )}

        {addingProduct && (
          <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 lg:flex-row lg:items-center">
            <input
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              placeholder="Nombre del producto..."
              className="flex-1 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            />
            <select
              value={newProductType}
              onChange={(event) => setNewProductType(event.target.value)}
              className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => createProduct.mutate()}
                disabled={!newProductName || createProduct.isPending}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                Guardar
              </button>
              <button
                onClick={() => setAddingProduct(false)}
                className="rounded-full px-4 py-2 text-sm text-stone-500 transition hover:bg-stone-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Clasificacion de productos</h2>
            <p className="text-sm text-stone-500">
              Usa el filtro para llegar rapido al producto que genero la alerta.
            </p>
          </div>
          <input
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Buscar por nombre, codigo, tipo o linea..."
            className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 lg:max-w-md"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Linea</th>
                <th className="px-4 py-3 text-center">SaaS</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loadingProducts && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-stone-400">
                    Cargando...
                  </td>
                </tr>
              )}

              {!loadingProducts && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-stone-500">
                    No hay productos para ese filtro.
                  </td>
                </tr>
              )}

              {filteredProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  highlight={
                    !!productFromAlert &&
                    product.product_name.trim().toLowerCase() === productFromAlert.trim().toLowerCase()
                  }
                  onSave={(id, data) => updateProduct.mutate({ id, data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-stone-900">Consultores</h2>
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Pais</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loadingConsultants && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-stone-400">
                    Cargando...
                  </td>
                </tr>
              )}
              {(consultants ?? []).map((consultant) => (
                <ConsultantRow
                  key={consultant.id}
                  consultant={consultant}
                  onSave={(id, data) => updateConsultant.mutate({ id, data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
