module.exports = {
  _id: "_design/user",

  views: {

    byUsername: {

      map: function(doc) {
        if (doc.type && doc.type == 'user' && !doc.disabled) {
          emit(doc.username, doc);
        }
      },

      reduce: null
    }

  }
};