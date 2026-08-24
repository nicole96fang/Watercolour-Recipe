/* =========================================
   db.js · IndexedDB 封装
   - 库名: watercolour-recipe
   - 表: recipes (单 objectStore)
   - 字段: id, category, name, ingredients[], steps[], photos[], favorite,
           servings, cookTime, prepTime, updatedAt, createdAt
   - 照片以 dataURL (base64) 形式存 → 自动随库走 → 刷新/退出不会丢
   ========================================= */

(function(){
  const DB_NAME = "watercolour-recipe";
  const STORE = "recipes";
  const VERSION = 1;
  let dbPromise = null;

  function openDB(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)){
          const os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("byCategory", "category", { unique: false });
          os.createIndex("byFav", "favorite", { unique: false });
          os.createIndex("byUpdated", "updatedAt", { unique: false });
        }
      };
    });
    return dbPromise;
  }

  function tx(mode){
    return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE));
  }

  function reqToPromise(req){
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }

  const DB = {
    async listAll(){
      const os = await tx("readonly");
      return reqToPromise(os.getAll());
    },
    async listByCategory(cat){
      const os = await tx("readonly");
      const idx = os.index("byCategory");
      return reqToPromise(idx.getAll(IDBKeyRange.only(cat)));
    },
    async get(id){
      const os = await tx("readonly");
      return reqToPromise(os.get(id));
    },
    async put(recipe){
      const os = await tx("readwrite");
      return reqToPromise(os.put(recipe));
    },
    async remove(id){
      const os = await tx("readwrite");
      return reqToPromise(os.delete(id));
    },
    async clear(){
      const os = await tx("readwrite");
      return reqToPromise(os.clear());
    },
    async stats(){
      const all = await this.listAll();
      const byCat = {};
      let fav = 0;
      all.forEach(r => {
        byCat[r.category] = (byCat[r.category] || 0) + 1;
        if (r.favorite) fav++;
      });
      return { total: all.length, fav, byCat };
    }
  };

  // 暴露给外部
  window.RecipeDB = DB;
  window.uid = function(){
    return "r_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
  };
})();
