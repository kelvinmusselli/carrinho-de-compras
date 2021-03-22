import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);

      if(productIndex >= 0) {
        const amount = cart[productIndex].amount + 1;
        updateProductAmount({productId, amount});
        return;
      }

      const product: Product = await api.get(`/products/${productId}`).then((response) => {
        return response.data
      }).catch((error) => {
        throw new Error("product does not exist")
      });

      product.amount = 1;

      await api.get(`stock/${productId}`).then((response) => {
        const productStock: Stock = response.data;

        if(productStock.amount < product.amount) {
          throw new Error("out of stock")
        }
      });

      const newCart = [...cart, product];
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch(error) {
      switch (error.message) {
        case "out of stock":
          toast.error("Quantidade solicitada fora de estoque");
          break;
        
        case "product does not exist":
          toast.error('Erro na adição do produto');
          break;

        default:
          toast.error("Erro");
          break;
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);
      if(productIndex < 0) throw new Error("product does not exist")

      const newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch(error) {
      switch (error.message) {
        case "product does not exist":
          toast.error('Erro na remoção do produto');
          break;
      
        default:
          break;
      }
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return;

      const productStock = await api.get(`stock/${productId}`).then((response) => {
        return response.data;
      }).catch((error) => {
        throw new Error("product does not exist")
      });

      if(productStock.amount < amount) {
        throw new Error("out of stock")
      }

      const newCart = cart.map(product => {
        if(product.id === productId) product.amount = amount;
        return product;
      })

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch(error) {
      switch (error.message) {
        case "out of stock":
          toast.error("Quantidade solicitada fora de estoque");
          break;
        
        case "product does not exist":
          toast.error('Erro na alteração de quantidade do produto');
          break;
      
        default:
          toast.error("Erro");
          break;
      }
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
