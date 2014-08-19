module.exports = {
  _id: "_design/fixtures",

  views: {

    currentSeason: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && doc.current) {
          emit(doc.name, doc);
        }
      },

      reduce: null
    },

    notCurrentSeasons: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && !doc.current) {
          emit(doc.name, doc);
        }
      },

      reduce: null
    }

  }
};