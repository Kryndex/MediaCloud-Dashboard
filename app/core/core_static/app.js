App = {
    
    config: {
      debug: false,
      datepickerOptions: {
        format: 'yyyy-mm-dd'
      },
      persistHeader: true,
      cookieOpts: {
        'expires': 14
      }
    },
    
    // get the url to a tool
    getToolUrl: function(tool){
      return 'https://'+tool+'.'+App.config.cookieOpts['domain']+'/#'+App.con.queryCollection.dashboardUrl();
    },

    getSourcesUrl: function(type,id){
      // type = [ sources | collections ]
      return 'https://sources.mediacloud.org/#'+type+'/'+id;
    },

    // Take a Collection and return a map using the specified key
    makeMap: function (col, key) {
        dataMap = {};
        col.each(function (datum) {
            dataMap[datum.get(key)] = datum;
        });
        return dataMap;
    },
    
    /**
     * Given array of date objects, return object with keys:
     * - year
     * - month
     * Each contains the first date object for a given year/month
     */
    dateLabels: function (dates) {
      results = { year: [], month:[] };
      // Find indeces of first occurence of each month
      var lastMonthYear = undefined;
      var lastYear = undefined;
      for (idx in dates){
        var d = dates[idx];
        var thisMonthYear = d.getUTCFullYear()+"-"+d.getUTCMonth();
        var thisYear = d.getUTCFullYear();
        if(thisMonthYear!=lastMonthYear){
          results['month'].push(d);
          lastMonthYear = thisMonthYear;
        }
        if(thisYear!=lastYear){
          results['year'].push(d);
          lastYear= thisYear;
        }
      }
      return results;
    },
    
    monthName: function (m) {
        return App.config.shortMonthNames[m];
    },
    
    // Round n to nearest half-integer
    halfint: function (n) {
        return Math.round(n + 0.5) - 0.5;
    },
    
    debug: function (message) {
        if (App.config.debug) {
            console.log(message);
        }
    }
}
