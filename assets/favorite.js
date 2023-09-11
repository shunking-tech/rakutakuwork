(function() {
  addFavoriteProduct();

  function addFavoriteProduct() {
    console.log('お気に入り追加処理')

    let product_id = document.getElementById('product-id').dataset.productId; // 商品ID取得
    let customer_id = document.getElementById('customer-id').dataset.customerId; // 商品ID取得

    var httpRequest = new XMLHttpRequest();
    
    if (!httpRequest) {
      alert('中断 :( XMLHTTP インスタンスを生成できませんでした');
      return false;
    }
    
    httpRequest.open(
      'POST',
      // `https://addfavoriteproduct-tzvzaaarsq-uc.a.run.app`,
      `http://127.0.0.1:5001/rakutakuwork-cloud/us-central1/addFavoriteProduct`,
      true
    );
    httpRequest.setRequestHeader( 'Content-Type', 'application/json' );
    httpRequest.onload = () => {
      console.log(`レスポンス：${httpRequest.response}`)
    }
    httpRequest.send(JSON.stringify({
      product_id: product_id,
      customer_id: customer_id,
    }));
    httpRequest.onreadystatechange = alertContents;
  }
  
  function alertContents() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        console.log("リクエスト成功");
      } else {
        console.log('リクエストエラー')
        console.log(httpRequest.response);
        alert('リクエストに問題が発生しました');
      }
    }
  }
})();