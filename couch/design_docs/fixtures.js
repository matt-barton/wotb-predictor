module.exports = {
  _id: "_design/fixtures",

  views: {

    currentSeason: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && doc.current) {
          emit(doc.name, doc);
        }
      },

      reduce: function() {}
    },

    notCurrentSeasons: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && !doc.current) {
          emit(doc.name, doc);
        }
      },

      reduce: function() {}
    },

    byId: {

      map: function(doc) {
        if (doc.type && doc.type == 'season') {
          emit(doc._id, doc);
        }
      },

      reduce: function() {}
    },

    allSeasonNames: {

      map: function(doc) {
        if (doc.type && doc.type == 'season') {
          emit(doc._id, doc.name);
        }
      },

      reduce: function() {}
    }
  }
};