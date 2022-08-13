import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartItem = api.get(`/products/${productId}`);
      const { data } = await cartItem;

      const productExists = cart.find((p) => p.id === productId);
      const checkStock = await (await api.get(`/stock/${productId}`)).data;

      if (productExists) {
        if (productExists.amount === checkStock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        const addMore = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
        );

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(addMore));
        setCart(addMore);

        return;
      }

      if (checkStock.amount < 1) {
        toast.error("Produto sem estoque");
        return;
      }

      const productCart = {
        ...data,
        amount: 1,
      };
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...cart, productCart])
      );
      setCart([...cart, productCart]);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const hasProductInCart = cart.find((p) => p.id === productId);
      if (!hasProductInCart) {
        toast.error("Erro na remoção do produto");
        return;
      }
      const findProduct = cart.filter((product) => product.id !== productId);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(findProduct));
      setCart(findProduct);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const checkStock = await (await api.get(`/stock/${productId}`)).data;

      if (amount > checkStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const product = cart.find((product) => product.id === productId);

      if (product?.amount === 1 && amount === 0) {
        return;
      }

      const cartWithAmountUpdated = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        }
        return product;
      });
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(cartWithAmountUpdated)
      );
      setCart(cartWithAmountUpdated);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
