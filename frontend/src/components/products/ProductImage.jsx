import { productImageUrl } from "../../api/productsApi";
import Icon from "../Icon";

function ProductImage({ product, className = "size-11" }) {
  const url = productImageUrl(product.image);

  if (!url) {
    return (
      <span className={"grid shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400 " + className}>
        <Icon name="products" className="size-5" />
      </span>
    );
  }

  return (
    <img
      className={"shrink-0 rounded-xl border border-slate-100 object-cover " + className}
      src={url}
      alt=""
    />
  );
}

export default ProductImage;
