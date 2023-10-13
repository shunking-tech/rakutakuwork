/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const Shopify = require('shopify-api-node');
const axios = require('axios');

// ショップの情報
const SHOP_URL = 'rakutakuwork.myshopify.com';
const API_KEY = process.env.SHOPIFY_API_KEY;
const API_PASSWORD = process.env.SHOPIFY_API_PASS;

exports.updateFavoriteProduct = onRequest(async (req, res) => {
  console.log("お気に入り追加!!!!");
  console.log(req.body);

  const product_id = req.body.product_id;
  const customer_id = req.body.customer_id;
  const favorite_namespace = "favorite";
  const product_favorite_count_metafield_key = 'count';
  const customer_favorite_products_metafield_key = 'products';
  // Shopify接続設定
  const shopify = new Shopify({ shopName: SHOP_URL, apiKey: API_KEY, password: API_PASSWORD });

  console.log(`customer_id: ${req.body.customer_id}`)

  try {
    // 顧客メタフィールドを取得
    const customer_metafields_response = await axios.get(`https://${API_KEY}:${API_PASSWORD}@${SHOP_URL}/admin/api/2023-07/customers/${customer_id}/metafields.json`);
    let customer_metafields = customer_metafields_response.data.metafields
    // お気に入り一覧のメタフィールドを取得
    let customer_metafield_favorite = customer_metafields.find(mf => mf.key === customer_favorite_products_metafield_key);
    // お気に入り一覧のデータを配列にする
    let customer_favorite_list = customer_metafield_favorite ? customer_metafield_favorite.value.replace('[', '').replace(']', '').split(',') : []
    // 開いている商品をお気に入り登録しているかどうか
    let favorited = customer_metafield_favorite ? customer_metafield_favorite.value.includes(product_id) : false

    // 顧客メタフィールド「お気に入り一覧」の値がある場合は更新、空の場合は作成
    if (customer_metafield_favorite) {
      if (favorited) {
        console.log('顧客メタフィールド更新　削除')
        // お気に入り一覧から商品削除
        customer_favorite_list.splice(customer_favorite_list.indexOf(`gid://shopify/Product/${product_id}`))
      } else {
        console.log('顧客メタフィールド更新　追加')
        // お気に入り一覧に商品追加
        customer_favorite_list.push(`"gid://shopify/Product/${product_id}"`)
      }
      customer_metafield_favorite.value = `[${customer_favorite_list.join(',')}]`;  // 更新後のお気に入り一覧をメタフィールドのオブジェクトに保存する
      // お気に入り一覧のメタフィールドを更新
      if (customer_favorite_list.length == 0) { // お気に入り商品の数が０になるときは、お気に入り一覧のメタフィールドを削除
        await shopify.metafield.delete(customer_metafield_favorite.id);
      } else { // お気に入り商品の数が０ではないときは、お気に入り一覧のメタフィールドを更新
        await shopify.metafield.update(customer_metafield_favorite.id, {
          ...customer_metafield_favorite
        });
      }
    } else {
      console.log('顧客メタフィールド新規')
      // お気に入り一覧に商品追加
      customer_favorite_list.push(`"gid://shopify/Product/${product_id}"`)
      // お気に入り一覧のメタフィールドを保存
      customer_metafield_favorite = {
        key: customer_favorite_products_metafield_key,
        value: `[${customer_favorite_list.join(',')}]`,
        type: 'list.product_reference',
        namespace: favorite_namespace,
        owner_resource: 'customer',
        owner_id: customer_id
      };

      await shopify.metafield.create({
        ...customer_metafield_favorite
      });
    }

    // 商品メタフィールドを取得
    const product_metafields_response = await axios.get(`https://${API_KEY}:${API_PASSWORD}@${SHOP_URL}/admin/api/2023-07/products/${product_id}/metafields.json`);
    let product_metafields = product_metafields_response.data.metafields
    // 商品メタフィールド「お気に入り数」の値がある場合は更新、空の場合は作成
    let product_metafield = product_metafields.find(mf => mf.key === product_favorite_count_metafield_key);
    if (product_metafield) {
      if (favorited) {
        console.log('商品メタフィールド更新　削除')
        product_metafield.value -= 1; // 商品メタフィールド「お気に入り数」の値を1減らす
      } else {
        console.log('商品メタフィールド更新　追加')
        product_metafield.value += 1; // 商品メタフィールド「お気に入り数」の値を1増やす
      }

      return await shopify.metafield.update(product_metafield.id, {
        ...product_metafield
      });
    } else {
      console.log('商品メタフィールド新規')
      product_metafield = {
        key: product_favorite_count_metafield_key,
        value: 1,
        type: 'number_integer',
        namespace: favorite_namespace,
        owner_resource: 'product',
        owner_id: product_id
      };

      return await shopify.metafield.create({
        ...product_metafield
      });
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    res.status(500).send('Internal Server Error');
  }
});
