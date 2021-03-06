App.SummaryContentView = Backbone.View.extend({
    name: 'SummaryContentView',
    sentenceTemplate: _.template('<strong><span style="color:<%=color%>"><%=name%></span></strong>: <%=sentenceCount%> sentences found across <%=across%>.'),
    storyTemplate: _.template('<strong><span style="color:<%=color%>"><%=name%></span></strong>: <%=storyCount%> stories found across <%=across%>.'),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        if(App.con.userModel.canListSentences()){
            var template = this.sentenceTemplate;
            var storyCount = this.model.get('results').get('sentences').totalStories;
            var sentenceCount = this.model.get('results').get('sentences').totalSentences;
        } else {
            var template = this.storyTemplate;
            var storyCount = this.model.get('results').get('stories').totalStories;
            var sentenceCount = this.model.get('results').get('stories').totalSentences;
        }
        sourceCount = this.model.get('params').get('mediaModel').get('sources').length;
        tagCount = this.model.get('params').get('mediaModel').get('tags').length;
        if (sourceCount === 0 && tagCount === 0) {
            var across = "all sources";
        } else {
            var across = "";
            if (sourceCount > 0) {
                across += sourceCount + " source";
                if (sourceCount > 1) {
                    across += "s";
                }
                if (tagCount > 0) {
                    across += " and ";
                }
            }
            if (tagCount > 0) {
                across += tagCount + " collection";
                if (tagCount > 1) {
                    across += "s";
                }
            }
        }
        $content = template({
            color: this.model.getColor(),
            name: this.model.getName(),
            sentenceCount: sentenceCount,
            storyCount: storyCount,
            across: across
        });
        this.$el.append($content);
    }
});

App.SummaryView = Backbone.View.extend({
    name: 'SummaryView',
    template: _.template($('#tpl-summary-view').html()),
    events: {
    },
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var that = this;
        App.debug('App.SummaryView.render()');
        this.$el.html(this.template());
        var $el = this.$('.panel-body');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress());
        this.listenTo(this.collection.resources, 'resource:allComplete', function () {
            $el.html('');
            var queryCount = that.collection.length;
            App.debug("App.SummaryView.render");
            that.collection.each(function (queryModel) {
                var content = new App.SummaryContentView({
                    model: queryModel
                });
                $el.append(content.$el);
            })
        });
    }
});
App.SummaryView = App.SummaryView.extend(App.ActionedViewMixin);

App.SentenceVizView = Backbone.View.extend({
    name: 'SentenceVizView',
    sentenceTemplate: _.template($('#tpl-one-sentence-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.addClass('query-sentences');
        var totalSentences = this.collection.totalSentences;
        var totalStories = this.collection.totalStories;
        this.addSentences(this.collection.last(10), this.sentenceTemplate, this.$el);
    },
    addSentences: function(sentences,templateToRender,element){
        _.each(sentences, function (m) {
            element.append( templateToRender({'sentence':m}) );
        }, this);
    },
});

App.SentenceView = Backbone.View.extend({
    name: 'SentenceView',
    template: _.template($('#tpl-sentence-view').html()),
    queryHeaderTemplate: _.template('<h3 id="<%=domId%>" style="color:<%=color%>;"><%=title%> <small>(<%=sentenceCount%> sentences match in <%=storyCount%> stories)</small></h3>'),
    events: {
        'click li.action-about > a': 'clickAbout'
    },
    initialize: function (options) {
        this.render();
    },
    formatNumber: function(num){
        var parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    },
    render: function () {
        var that = this;
        App.debug('App.SentenceView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        var $el = this.$('.sentence-view .copy');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress());
        this.listenTo(this.collection.resources, 'resource:complete:sentence', function () {
            $el.html('');
            var queryCount = that.collection.length;
            App.debug("App.SentenceView.render with "+queryCount+" query results to show");
            var viz;
            if (queryCount >= 2) {
                for (i = 0; i < queryCount; i++) {
                    var totalSentences = that.collection.at(i).get('results').get('sentences').totalSentences;
                    var totalStories = that.collection.at(i).get('results').get('sentences').totalStories;
                    var $title = that.queryHeaderTemplate({
                        'domId':that.collection.at(i).getName(),
                        'color':that.collection.at(i).getColor(),
                        'sentenceCount':that.formatNumber(totalSentences),
                        'storyCount': that.formatNumber(totalStories),
                        'title':that.collection.at(i).getName()});
                    $el.append($title);
                    viz = new App.SentenceVizView({
                        collection: that.collection.at(i).get('results').get('sentences')
                    });
                    $el.append(viz.$el);
                }
                that.$('.count').html('');
            } else {
                var sentences = that.collection.at(0).get('results').get('sentences');
                // figure out the total sentence count
                totalSentences = sentences.totalSentences;
                totalStories = sentences.totalStories;
                //totalSentences = sentences.last(1)[0].get('totalSentences');
                that.$('.count').html('(' + that.formatNumber(totalSentences) + ' sentences found in '+that.formatNumber(totalStories)+' stories)');
                // now list some of the sentences
                viz = new App.SentenceVizView({
                    collection: that.collection.at(0).get('results').get('sentences')
                });
                $el.append(viz.$el);
            }
            // now that the query collection is filled in, add the download data links
            var downloadInfo = that.collection.map(function(m) { 
                return {
                    'url':m.get('results').get('sentences').csvUrl(),
                    'name':m.getName()
                };
            });
            // clean up and prep for display
            that.resetDownloadMenuItems(downloadInfo);
            that.delegateEvents();
            that.showActionMenu();
        });
        this.collection.on('execute', function () {
            $el.html(progress());
        });
        this.delegateEvents();
        this.listenTo(this.collection, 'mm:colorchange', function(model) {
            $('h3#'+ model.getName()).css('color', model.getColor());
        });
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        ga('send', 'event', 'about', 'view', 'mentions:sentences', '');
        this.aboutView = new App.AboutView({template: '#tpl-about-sentences-view'});
        $('body').append(this.aboutView.el);
    }
});
App.SentenceView = App.SentenceView.extend(App.ActionedViewMixin);

App.StoryVizView = Backbone.View.extend({
    name: 'StoryVizView',
    storyTemplate: _.template($('#tpl-one-story-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.addClass('query-stories');
        var totalStories = this.collection.length;
        this.addStories(this.collection.last(10), this.storyTemplate, this.$el);
    },
    addStories: function(stories,templateToRender,element){
        _.each(stories, function (m) {
            element.append( templateToRender({'story':m}) );
        }, this);
    },
});

App.StoryView = Backbone.View.extend({
    name: 'StoryView',
    template: _.template($('#tpl-story-view').html()),
    events: {
        'click li.action-about > a': 'clickAbout'
    },
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var that = this;
        App.debug('App.StoryView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        this.$el.find('.panel-title .count').html('');
        var $el = this.$('.story-view .copy');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress());
        // render one of two lists
        this.listenTo(this.collection.resources, 'resource:complete:story', function () {
            $el.html('');
            var query1Stories = that.collection.models[0].get('results').get('stories');
            var viz;
            if (that.collection.length >= 2) {
                var query2Stories = that.collection.models[1].get('results').get('stories');
                // add main and comparison queries
                $el.append('<h3 class="first-query">'+that.collection.at(0).get('params').get('keywords')+': '+
                    'A sampling of stories ('+query1Stories.totalStories+' total)</h3>');
                viz = new App.StoryVizView({
                    collection: that.collection.at(0).get('results').get('stories')
                });
                $el.append(viz.$el);
                $el.append('<h3 class="second-query">'+that.collection.at(1).get('params').get('keywords')+': '+
                    'A sampling of stories ('+query2Stories.totalStories+' total)</h3>');
                viz = new App.StoryVizView({
                    collection: that.collection.at(1).get('results').get('stories')
                });
                $el.append(viz.$el);
            } else {
                // had just a main query
                viz = new App.StoryVizView({
                    collection: that.collection.at(0).get('results').get('stories')
                });
                $el.append(viz.$el);
            }
            // now that the query collection is filled in, add the download data links
            var downloadInfo = that.collection.map(function(m) { 
                return {
                    'url':m.get('results').get('stories').csvUrl(),
                    'name':m.getName()
                };
            });
            that.resetDownloadMenuItems(downloadInfo);
            // clean up and prep for display
            that.delegateEvents();
            that.showActionMenu();
        });
        this.collection.on('execute', function () {
            $el.html(progress());
        });
        this.delegateEvents();
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        ga('send', 'event', 'about', 'view', 'mentions:stories', '');
        this.aboutView = new App.AboutView({
            template: '#tpl-about-stories-view'
        });
        $('body').append(this.aboutView.el);
    }
});
App.StoryView = App.StoryView.extend(App.ActionedViewMixin);

// Wrapper view for single word clouds and comparison word cloud
App.WordCountView = App.NestedView.extend({
    name: 'WordCountView',
    template: _.template($('#tpl-wordcount-view').html()),
    events: {
        'click li.action-about > a': 'clickAbout',
    },
    initialize: function (options) {
        this.resultViews = null;
        this.comparisonViews = null;
        _.bindAll(this, 'clickSvg');
        this.render();
    },
    render: function () {
        App.debug('App.WordCountView.render()');
        var that = this;
        this.$el.html(this.template());
        this.hideActionMenu();
        var $el = this.$('.panel-body');
        this.$('.wordcount-view .copy').html(_.template($('#tpl-progress').html())());
        // and render the right subview
        this.listenTo(this.collection.resources, 'resource:complete:wordcount', function () {
            that.$('.wordcount-view .copy').hide();
            if (that.collection.length >=2){
                // only render comparison when >=2 queries
                that.renderWordCountComparison(that.collection);
            } else {
                // render individual word clouds for each query
                that.renderWordCountResults(that.collection.at(0));
            }
            // add in data download links
            var downloadInfo = that.collection.map(function(m) { 
                return {
                    'url':m.get('results').get('wordcounts').csvUrl(),
                    'name':m.getName()
                };
            });
            that.resetDownloadMenuItems(downloadInfo);
            // Add download SVG option
            that.appendDownloadMenuItem(null, 'Download as SVG', 'svg-download');
            that.$('a.svg-download').on('click', that.clickSvg);
            // and clean up and prep the UI
            that.delegateEvents();
            that.showActionMenu();
        });
        // Reset when the query executes
        this.listenTo(this.collection, 'execute', function () {
            App.debug('App.WordCountView.collection:execute');
            this.$('.wordcount-view .copy').show();
            this.$('.viz').html('');
        }, this);
    },
    
    renderWordCountResults: function (queryModel) {
        App.debug('App.WordCountView.renderWordCountResults()');
        var wordCountResultView = new App.WordCountOrderedView({'model':queryModel,refine:this.collection.refine});
        this.addSubView(wordCountResultView);
        var $el = this.$('.viz');
        $el.append(wordCountResultView.$el);
    },

    renderWordCountComparison: function (collection) {
        App.debug('App.WordCountView.renderWordCountComparison()');
        var wordCountComparisonView = new App.WordCountComparisonView({'collection':collection});
        this.addSubView(wordCountComparisonView);
        var $el = this.$('.viz');
        $el.append(wordCountComparisonView.$el);
    },

    clickAbout: function (evt) {
        evt.preventDefault();
        ga('send', 'event', 'about', 'view', 'frequency', '');
        this.aboutView = new App.AboutView({
            template: '#tpl-about-wordcount-view'
        });
        $('body').append(this.aboutView.el);
    },

    clickSvg: function (evt) {
        evt.preventDefault();
        var s = new XMLSerializer();
        var data = s.serializeToString(this.$('svg').get(0));
        this.$('.svg-download input[name="content"]').val(data);
        this.$('.svg-download').submit();
    }
    
});
App.WordCountView = App.WordCountView.extend(App.ActionedViewMixin);

App.WordCountOrderedView = Backbone.View.extend({
    name: 'WordCountOrderedView',
    config: {
        // Use sizeRange() to read, might be dynamic in the future
        sizeRange: { min: 10, max: 64 }
        , height: 400
        , padding: 10
        , linkColor: "#428bca"
        , labelSize: 16
    },

    template: _.template($('#tpl-wordcount-ordered-view').html()),
    
    initialize: function (options) {
        this.refine = options.refine;
        _.bindAll(this,'refineBothQueries');
        this.render();
    },
    updateStats: function () {
        this.all = this.model.get('results').get('wordcounts').toJSON();
        var countSel = function (d) { return d.count };
        var allSum = d3.sum(this.all, countSel);
        this.center = _.first(this.all, 100);
        // Normalize
        _.each(this.center, function (d) {
            d.tfnorm = d.count / allSum;
        });
        this.fullExtent = d3.extent(this.all, function (d) { return d.tfnorm; })
    },
    render: function () {
        var that = this;
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        _.defer(function () { 
            that.renderSvg();
        });
        this.listenTo(this.model, 'mm:colorchange', function() {
           that.$('g.intersect-group circle').attr('fill', that.model.getColor());
            d3.select(that.el).selectAll('.word')
                .attr('fill', that.model.getColor());
       });
    },
    sizeRange: function () {
        return _.clone(this.config.sizeRange);
    },
    fontSize: function (term, extent, sizeRange) {
        if (typeof(sizeRange) === 'undefined') {
            sizeRange = this.sizeRange();
        }
        var size = sizeRange.min
            + (sizeRange.max - sizeRange.min)
                * ( Math.log(term.tfnorm) - Math.log(extent[0]) ) / ( Math.log(extent[1]) - Math.log(extent[0]) );
        return size;
    },
    termText: function(d){
        return d.term + d.count + ' ';
    },
    renderSvg: function () {
        var that = this;
        var container = d3.select(this.el).select('.content-viz');
        var width = this.$('.content-viz').width();
        var innerWidth = width - 2*this.config.padding;
        var svg = container.append('svg')
            .attr('height', this.config.height)
            .attr('width', width);
        var intersectGroup = svg.append('g').classed('intersect-group', true)
            .attr('transform', 'translate('+(this.config.padding)+')');
        var sizeRange = this.sizeRange();
        var intersectWords;
        var label = intersectGroup.append('text')
            .text(this.model.getName())
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        intersectGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', this.model.getColor());
        var y = this.config.height;
        var wordListHeight = this.config.height - 1.5*this.config.labelSize - 2*this.config.padding;
        var wordList = intersectGroup.append('g')
            .attr('transform', 'translate(0,' + (1.5*this.config.labelSize) + ')');
        while (y >= wordListHeight && sizeRange.max > sizeRange.min) {
            // Create words
            intersectWords = wordList.selectAll('.word')
                .data(this.center, function (d) { return d.stem; });
            intersectWords.enter()
                .append('text').classed('word', true).classed('intersect', true);
            intersectWords
                .attr('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent, sizeRange); });
            d3.select(that.el).selectAll('.word')
                .text(function (d) { return d.term; })
                .attr('font-weight', 'bold')
                .attr('fill', this.model.getColor());
                //.attr('fill', App.config.queryColors[0]);
            // Layout
            y = 0;
            intersectHeight = this.listCloudLayout(intersectWords, innerWidth, this.fullExtent, sizeRange);
            y = Math.max(y, intersectHeight);
            sizeRange.max = sizeRange.max - 1;
        }
        if (y < this.config.height) {
            svg.attr('height', y + 1.5*this.config.labelSize);
        }
        d3.select(that.el).selectAll('.word')
            .on('mouseover', function () {
                d3.select(this).attr('fill', that.config.linkColor)
                .attr('cursor','pointer');
            })
            .on('mouseout', function () {
                var color = that.model.getColor();
                d3.select(this).attr('fill', color)
                .attr('cursor','default');
            });
        d3.select(that.el).selectAll('.intersect.word')
            .on('click', this.refineBothQueries);
    },
    refineBothQueries: function(d){
        ga('send', 'event', 'query', 'refine', 'frequncy', '');
        this.refine.trigger('mm:refine',{term:d.stem+'*'});
    },
    listCloudLayout: function (words, width, extent, sizeRange) {
        var that = this;
        var x = 0;
        var canvas = App.canvas;
        var canvasContext2d = canvas.getContext("2d");
        words.attr('x', function (d) {
            var fs = that.fontSize(d, extent, sizeRange);
            canvasContext2d.font = "bold "+fs+"px Lato";    // crazy hack for IE compat, instead of simply this.getComputedTextLength()
            var metrics = canvasContext2d.measureText(d.term);
            textLength = metrics.width;
            var lastX = x;
            if (x + textLength + that.config.padding > width) {
                lastX = 0;
            }
            x = lastX + textLength + 0.3*fs;
            return lastX;
        });
        var y = -0.5 * that.fontSize(that.center[0], extent, sizeRange);
        var lastAdded = 0;
        words.attr('y', function (d) {
            if (d3.select(this).attr('x') == 0) {
                y += 1.5 * that.fontSize(d, extent, sizeRange);
                lastAdded = 1.5 * that.fontSize(d, extent, sizeRange);
            }
            return y;
        });
        return y + lastAdded;
    }
});

// View for comparison word cloud
App.WordCountComparisonView = Backbone.View.extend({
    name: 'WordCountComparisonView',
    config: {
        // Use sizeRange() to read, might be dynamic in the future
        sizeRange: { min: 10, max: 24 }
        , height: 400
        , padding: 10
        , linkColor: "#428bca"
        , labelSize: 16
    },

    template: _.template($('#tpl-wordcount-comparison-view').html()),
    
    events: {'change select#left-select' :'changeQuery', 'change select#right-select' :'changeQuery'},

    initialize: function () {
        _.bindAll(this,'refineBothQueries');
        this.leftQuery = 0;
        this.rightQuery = 1;
        this.leftModel = this.collection.at(0);
        this.rightModel = this.collection.at(1);
        this.render();
    },
    updateStats: function () {
        var allLeft = this.collection.at(this.leftQuery).get('results').get('wordcounts').toJSON();
        var allRight = this.collection.at(this.rightQuery).get('results').get('wordcounts').toJSON();
        var countSel = function (d) { return d.count };
        var leftSum = d3.sum(allLeft, countSel);
        var rightSum = d3.sum(allRight, countSel);
        var topLeft = _.first(allLeft, 100);
        var topRight = _.first(allRight, 100);
        // Normalize
        _.each(topLeft, function (d) {
            d.tfnorm = d.count / leftSum;
        });
        _.each(topRight, function (d) {
            d.tfnorm = d.count / rightSum;
        })
        // Find L - R, L int R, R - L
        var terms = {}
        _.each(topLeft, function (d) {
            terms[d.stem] = d;
            terms[d.stem].left = true;
        });
        _.each(topRight, function (d) {
            if (!terms[d.stem]) {
                terms[d.stem] = d;
            } else {
                terms[d.stem].tfnorm = (terms[d.stem].count + d.count) / (leftSum + rightSum);
            }
            terms[d.stem].right = true;
        });
        this.left = _.filter(terms, function (d) { return d.left && !d.right; });
        this.right = _.filter(terms, function (d) { return d.right && !d.left; });
        this.center = _.filter(terms, function (d) { return d.left && d.right; });
        this.center.sort(function (a, b) {
            return b.tfnorm - a.tfnorm;
        });
        this.all = this.left.concat(this.right);
        this.all = this.all.concat(this.center);
        this.fullExtent = d3.extent(this.all, function (d) { return d.tfnorm; })
    },
    render: function () {
        var that = this;
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        _.defer(function () {
            if (that.collection.length < 3) {
                that.$('.query-select').hide();
            } else {
                that.$('.query-select').show();
            }
            //query-dropdown
            var queryNumber = -1;
            that.collection.each(function(queryModel){
                queryNumber++;
                if (queryNumber === that.leftQuery){
                    that.$('.dropdown-left #left-select').append("<option class=selection selected='selected' id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else {
                    that.$('.dropdown-left #left-select').append("<option class=selection id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                if (queryNumber === that.rightQuery){
                    that.$('.dropdown-right #right-select').append("<option class=selection selected='selected' id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else{
                    that.$('.dropdown-right #right-select').append("<option class=selection id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                });
            that.renderSvg();
        });
        this.listenTo(this.collection, 'mm:colorchange', function() {
           that.$('g.left-group circle').attr('fill', that.leftModel.getColor());
           that.$('g.right-group circle').attr('fill', that.rightModel.getColor());
            d3.select(that.el).selectAll('.left.word')
                .attr('fill', that.leftModel.getColor());
            d3.select(that.el).selectAll('.right.word')
                .attr('fill', that.rightModel.getColor());
       });
    },
    changeQuery: function(ev) {
        var currentValue = parseInt($(ev.currentTarget).val());
        if ($(ev.currentTarget).attr('id') === "left-select") {
            this.leftQuery = currentValue;
            this.leftModel = this.collection.at(this.leftQuery);
        } else {
            this.rightQuery = currentValue;
            this.rightModel = this.collection.at(this.rightQuery);
        }
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        var that = this;
        _.defer(function(){
            //query-dropdown
            var queryNumber = -1;
            that.collection.each(function(queryModel){
                queryNumber++;
                if (queryNumber === that.leftQuery){
                    that.$('.dropdown-left #left-select').append("<option class=selection selected='selected' id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else {
                    that.$('.dropdown-left #left-select').append("<option class=selection id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                if (queryNumber === that.rightQuery){
                    that.$('.dropdown-right #right-select').append("<option class=selection selected='selected' id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else{
                    that.$('.dropdown-right #right-select').append("<option class=selection id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
            });
            that.renderSvg();
        })
    },
    sizeRange: function () {
        return _.clone(this.config.sizeRange);
    },
    fontSize: function (term, extent, sizeRange) {
        if (typeof(sizeRange) === 'undefined') {
            sizeRange = this.sizeRange();
        }
        var size = sizeRange.min
            + (sizeRange.max - sizeRange.min)
                * ( Math.log(term.tfnorm) - Math.log(extent[0]) ) / ( Math.log(extent[1]) - Math.log(extent[0]) );
        return size;
    },
    termText: function(d){
        return d.term + d.count + ' ';
    },
    renderHtml: function () {
        var that = this;
        var container = d3.select(this.el).select('.content-text');
        container.append('h3').text('Main');
        container.append('div').selectAll('.left')
            .data(this.left, function (d) { return d.stem; })
            .enter()
                .append('span').classed('left', true)
                .style('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent) + 'px';
                })
                .style('font-weight', 'bold')
                .text(this.termText);
        container.append('h3').text('Intersection');
        container.append('div').selectAll('.intersection')
            .data(this.center, function (d) { return d.stem; })
            .enter()
                .append('span').classed('intersection', true)
                .style('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent) + 'px';
                })
                .style('font-weight', 'bold')
                .text(this.termText);
        container.append('h3').text('Comparison');
        container.append('div').selectAll('.right')
            .data(this.right, function (d) { return d.stem; })
            .enter()
                .append('span').classed('right', true)
                .style('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent) + 'px';
                })
                .style('font-weight', 'bold')
                .text(this.termText);
    },
    renderSvg: function () {
        var that = this;
        var container = d3.select(this.el).select('.content-viz');
        var width = this.$('.content-viz').width();
        if($.browser.name=="msie") width = 1138;    // HACK: this is terrible, but for IE, which computes width as zero :-(
        var innerWidth = (width - 8*this.config.padding)/3.0;
        var svg = container.append('svg')
            .attr('height', this.config.height)
            .attr('width', width);
        var leftGroup = svg.append('g').classed('left-group', true)
            .attr('transform', 'translate('+2*this.config.padding+')');
        var intersectGroup = svg.append('g').classed('intersect-group', true)
            .attr('transform', 'translate('+(innerWidth+4*this.config.padding)+')');
        var rightGroup = svg.append('g').classed('right-group', true)
            .attr('transform', 'translate('+(2.0*innerWidth+6*this.config.padding)+')');
        var y = this.config.height;
        var sizeRange = this.sizeRange();
        var leftWords, rightWords, intersectWords;
        var label = intersectGroup.append('text')
            .text('Both')
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        intersectGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', '#000000');
        label = leftGroup.append('text')
            .text(this.collection.at(this.leftQuery).getName())
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        leftGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', this.leftModel.getColor());
        var label = rightGroup.append('text')
            .text(this.collection.at(this.rightQuery).getName())
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        rightGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', this.rightModel.getColor());
        var wordListHeight = this.config.height - 1.5*this.config.labelSize - 2*this.config.padding;
        var intersectList = intersectGroup.append('g')
            .attr('transform', 'translate(0,' + (2*this.config.labelSize) + ')');
        var leftList = leftGroup.append('g')
            .attr('transform', 'translate(0,' + (2*this.config.labelSize) + ')');
        var rightList = rightGroup.append('g')
            .attr('transform', 'translate(0,' + (2*this.config.labelSize) + ')');
        while (y >= wordListHeight && sizeRange.max > sizeRange.min) {
            // Create words
            if (this.left.length > 0) {
                leftWords = leftList.selectAll('.word')
                    .data(this.left, function (d) { return d.stem; });
                leftWords.enter()
                    .append('text').classed('word', true).classed('left', true);
                leftWords
                    .attr('font-size', function (d) {
                        return that.fontSize(d, that.fullExtent, sizeRange); });
            }
            if (this.right.length > 0) {
                rightWords = rightList.selectAll('.word')
                    .data(this.right, function (d) { return d.stem; });
                rightWords.enter()
                    .append('text').classed('word', true).classed('right', true);
                rightWords
                    .attr('font-size', function (d) {
                        return that.fontSize(d, that.fullExtent, sizeRange); });
            }
            if (this.center.length > 0) {
                intersectWords = intersectList.selectAll('.word')
                    .data(this.center, function (d) { return d.stem; });
                intersectWords.enter()
                    .append('text').classed('word', true).classed('intersect', true);
                intersectWords
                    .attr('font-size', function (d) {
                        return that.fontSize(d, that.fullExtent, sizeRange); });
            }
            d3.selectAll('.word')
                .text(function (d) { return d.term; })
                .attr('font-weight', 'bold');
            d3.selectAll('.left.word')
                .attr('fill', this.leftModel.getColor());
            d3.selectAll('.right.word')
                .attr('fill', this.rightModel.getColor());
            // Layout
            y = 0;
            leftHeight = this.listCloudLayout(leftWords, innerWidth, this.fullExtent, sizeRange);
            intersectHeight = this.listCloudLayout(intersectWords, innerWidth, this.fullExtent, sizeRange);
            rightHeight = this.listCloudLayout(rightWords, innerWidth, this.fullExtent, sizeRange);
            y = Math.max(y, leftHeight);
            y = Math.max(y, intersectHeight);
            y = Math.max(y, rightHeight);
            sizeRange.max = sizeRange.max - 1;
        }
        if (y < this.config.height) {
            svg.attr('height', y + 2*this.config.labelSize);
        }
        d3.selectAll('.word')
            .on('mouseover', function () {
                d3.select(this).attr('fill', that.config.linkColor)
                .attr('cursor','pointer');
            })
            .on('mouseout', function () {
                var color = '#000';
                if (d3.select(this).classed('left')) {
                    color = that.leftModel.getColor();
                }
                if (d3.select(this).classed('right')) {
                    color = that.rightModel.getColor();
                }
                d3.select(this).attr('fill', color)
                .attr('cursor','default');
            });
        d3.selectAll('.left.word')
            .on('click', this.refineBothQueries);
        d3.selectAll('.right.word')
            .on('click', this.refineBothQueries);
        d3.selectAll('.intersect.word')
            .on('click', this.refineBothQueries);
    },
    refineBothQueries: function(d){
        ga('send', 'event', 'query', 'refine', 'frequency', '');
        this.collection.refine.trigger('mm:refine', {term: d.stem+'*'} );
    },
    listCloudLayout: function (words, width, extent, sizeRange) {
        App.debug('App.WordCountComparisonView.listCloudLayout - width'+width);
        var canvas = App.canvas;
        var canvasContext2d = canvas.getContext("2d");
        //App.debug(extent); App.debug(sizeRange); App.debug(words);
        var that = this;
        var x = 0;
        if (typeof(words) === 'undefined') {
            return 0;
        }
        words.attr('x', function (d) {
            var fs = that.fontSize(d, extent, sizeRange);
            canvasContext2d.font = "bold "+fs+"px Lato";    // crazy hack for IE compat, instead of simply this.getComputedTextLength()
            var metrics = canvasContext2d.measureText(d.term);
            textLength = metrics.width;
            var lastX = x;
            if (x + textLength + that.config.padding > width) {
                lastX = 0;
            }
            x = lastX + textLength + 0.3*fs;
            return lastX;
        });
        var y = -0.5 * sizeRange.max;
        var lastAdded = 0;
        words.attr('y', function (d) {
            if (d3.select(this).attr('x') == 0) {
                height = 1.5 * that.fontSize(d, extent, sizeRange);
                y += height;
                lastAdded = height;
            }
            return y;
        });
        return y + lastAdded;
    }
});

App.HistogramView = Backbone.View.extend({
    name: 'HistogramView',
    template: _.template($('#tpl-histogram-view').html()),
    events: {
        'click li.action-about > a' : 'clickAbout'
    },
    initialize: function (options) {
        App.debug('App.HistogramView.initialize()');
        this.render();
    },
    render: function () {
        App.debug('App.HistogramView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        progress = _.template($('#tpl-progress').html());
        this.$('.copy').html(progress());
        this.$('.viz').hide();
        // TODO allow for multiple results
        this.collection.resources.on('resource:complete:datecount', this.renderViz, this);
        this.listenTo(this.collection, 'execute', function () {
            this.$('.copy').html(progress()).show();
            this.$('.viz').html('');
        }, this);
        this.listenTo(
            this.collection.subqueryResources,
            'resource:complete:wordcount',
            this.onSubqueryWordcounts
        );
        this.listenTo(
            this.collection.subqueryResources,
            'resource:complete:sentence',
            this.onSubqueryStories
        );
        this.listenTo(
            this.collection.subqueryResources,
            'resource:complete:story',
            this.onSubqueryStories
        );
        this.listenTo(this.collection, 'mm:colorchange', this.renderViz);
    },
    renderViz: function () {
        App.debug('App.HistogramView.renderViz');
        // draw the chart
        this.$('.subquery').hide();
        this.renderHighChart();
        // now that the query collection is filled in, add the download data links
        var downloadInfo = this.collection.map(function(m) { 
            return {
                'url':m.get('results').get('datecounts').csvUrl(),
                'name':m.getName()
            };
        });
        this.resetDownloadMenuItems(downloadInfo);
        // register an about click handler
        this.delegateEvents();  // gotta run this to register the events again
        this.showActionMenu();
    },
    renderHighChart: function() {
        App.debug('App.HistogramView.renderHighChart');
        var that = this;
        var datasets = this.collection.map(function (queryModel) {
            return queryModel.get('results').get('datecounts').toJSON();
        });
        // set up the html container
        this.$('.copy').hide();
        this.$('.viz')
            .html('')
            .css('padding', '0')
            .show();
        // figure out the xAxis labels
        var dates = _.map(datasets[0], function(item){ return item.dateObj; });
        // generate the series
        var allSeries = [];
        var intervalMs = 0;
        _.each(datasets, function(item,idx){
            intervalMs = item[1].dateObj.getTime() - item[0].dateObj.getTime();
            var intervalDays = intervalMs / (1000 * 60 * 60 * 24);
            allSeries.push({
                id: idx, 
                name: that.collection.at(idx).getName(),
                color: that.collection.at(idx).getColor(),
                // turning variable time unit into days
                data: _.map(item, function(d){ return d.numFound / intervalDays; }),
                pointStart: item[0].dateObj.getTime(),
                pointInterval: intervalMs,
                cursor: 'pointer'
            });
        });
        var showLineMarkers = (allSeries[0].data.length < 30);   // don't show dots on line if more than N data points
        // set it all up 
        this.$('.viz').highcharts({
            title: {
                text: ''
            },
            chart: {
                type: 'spline',
                height: '180',
                zoomType: 'x',
                events: {
                    selection: function(evt){
                        evt.preventDefault();   // don't zoom
                        ga('send', 'event', 'query', 'refine', 'pulse', '');
                        that.collection.refine.trigger('mm:refine',{
                            start: Highcharts.dateFormat('%Y-%m-%d', evt.xAxis[0].min),
                            end: Highcharts.dateFormat('%Y-%m-%d', evt.xAxis[0].max)
                        });
                    }
                }
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: showLineMarkers
                    },
                    point: {
                        events: {
                            click: function (event) {
                                var date =Highcharts.dateFormat(
                                    '%Y-%m-%d'
                                    , this.x
                                );
                                var result = that.collection.at(this.series._i);
                                ga('send', 'event', 'pulse', 'click', result.getName() + ":" + date, '');
                                that.$('.subquery .wordcounts').html('');
                                that.$('.subquery .sentences').html('');
                                var progress = _.template($('#tpl-progress').html());
                                that.$('.subquery .wordcounts').append(progress);
                                progress = _.template($('#tpl-progress').html());
                                that.$('.subquery .sentences').append(progress);
                                that.$('.subquery').show();
                                var attributes = {
                                    start: date
                                    , end: date
                                    , color: result.getColor()
                                    , name: result.getName()
                                };
                                result.subqueryListener.trigger('mm:subquery', {
                                    queryCid: result.cid
                                    , attributes: attributes
                                });
                            }
                        }
                    }
                }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    millisecond: '%m/%e/%y',
                    second: '%m/%e/%y',
                    minute: '%m/%e/%y',
                    hour: '%m/%e/%y',
                    day: '%m/%e/%y',
                    week: '%m/%e/%y',
                    month: '%m/%y',
                    year: '%Y'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Sentences/day'
                }
            },
            exporting: {
                filename: 'mediacloud-pulse',
                scale: 3,
                sourceWidth: 1150,
                sourceHeight: 200
            },
            tooltip: {
                formatter: function() {
                    var s = [];
                    var endDate = this.x+intervalMs
                    s.push('<i>'+Highcharts.dateFormat('%m/%d/%Y',this.x)+' to '+
                        Highcharts.dateFormat('%m/%d/%Y',endDate)+'</i>');
                    $.each(this.points, function(i, point) {
                        s.push('<span style="color:'+point.series.color+';">'+ point.series.name +'</span>: '
                            + '<b>' + Math.round(point.y) +' sentences/day</b>');
                    });
                return s.join('<br />');
                },
                shared: true
            },
            series: allSeries
        });
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        ga('send', 'event', 'about', 'view', 'pulse', '');
        this.aboutView = new App.AboutView({
            template: '#tpl-about-histogram-view'
        });
        $('body').append(this.aboutView.el);
    },
    onSubqueryWordcounts: function () {
        this.$('.subquery .wordcounts .progress').remove();
        this.$('.subquery .wordcounts .subquery-header').remove();
        var subqueryHeader = $('<div>').addClass('subquery-header');
        subqueryHeader.append($('<h3>')
            .css('color', this.collection.subquery.attributes.color)
            .text(
            this.collection.subquery.attributes.name+": "+
            "Words Used on "+
            this.collection.subquery.attributes.params.get('start')
        ));
        this.$('.subquery .wordcounts').html('');
        this.$('.subquery').show();
        subqueryHeader.appendTo(this.$('.subquery .wordcounts'));
        wordcounts = this.collection.subquery.get('results').get('wordcounts');
        subqueryView = new App.WordCountOrderedView({
            'model':this.collection.subquery
        });
        subqueryView.$el.addClass('subquery').appendTo(this.$('.subquery .wordcounts'));
    },
    onSubqueryStories: function () {
        this.$('.subquery .sentences .progress').remove();
        this.$('.subquery .sentences .subquery-header').remove();
        var subqueryHeader = $('<div>').addClass('subquery-header');
        subqueryHeader.append($('<h3>')
            .css('color', this.collection.subquery.attributes.color)
            .text(
            this.collection.subquery.attributes.name+": "+
            "Stories on "+
            this.collection.subquery.attributes.params.get('start')
        ));
        this.$('.subquery .sentences').html('');
        this.$('.subquery').show();
        subqueryHeader.appendTo(this.$('.subquery .sentences'));
        var subqueryView;
        if(App.con.userModel.canListSentences()){
            options = {
                'collection':this.collection.subquery.get('results').get('sentences')
            };
            subqueryView = new App.SentenceVizView(options);
        } else {
            options = {
                'collection':this.collection.subquery.get('results').get('stories')
            };
            subqueryView = new App.StoryVizView(options);
        }
        subqueryView.$el.addClass('subquery').appendTo(this.$('.subquery .sentences'));
    }
});
App.HistogramView = App.HistogramView.extend(App.ActionedViewMixin);

App.CountryMapView = App.NestedView.extend({
    name: 'CountryMapView',
    template: _.template($('#tpl-country-map-view').html()),
    progressTemplate: _.template($('#tpl-progress').html()),
    rolloverTemplate: _.template('<span style="color:<%=color%>"><%=queryName%></span>: <b><%=count%></b> of sentences mention <%=country%>'),
    events: {
        'click li.action-about > a': 'clickAbout'
    },
    initialize: function (options) {
        this.render();
        this.mapInfo = {};
    },
    render: function () {
        App.debug("CountryMapView render");
        var that = this;
        this.$el.html(this.template());
        this.hideActionMenu();
        this.$el.find('.loading').html(this.progressTemplate());
        this.$('.loading').show();
        this.$('.viz').hide();
        this.$('.unsupported').hide();
        this.collection.on('execute', function () {
            that.$el.find('.loading').html(that.progressTemplate());
            that.$el.find('.loading').show();
            that.$('.unsupported').hide();
            that.$('.viz').hide();
        });
        this.delegateEvents();
        this.collection.resources.on('resource:complete:tagcount', this.renderResults, this);
    },
    renderResults: function() {
        if(this.collection.isGeoTagged()){
            this.renderMaps();
        } else {
            this.renderNoMaps();
        }
    },
    renderNoMaps: function(){
        this.$('.viz').html("").hide();
        this.$('.loading').hide();
        this.$('.unsupported').show();
    },
    renderMaps: function() {
        this.$('.viz').html("");
        App.debug("CountryMapView renderViz");
        var that = this;
        // init share map config into the this.mapInfo object
        this.mapInfo.width = 440;
        this.mapInfo.height = this.mapInfo.width / 2.19;
        this.mapInfo.scale = this.mapInfo.width / 5.18;
        this.mapInfo.offset = [this.mapInfo.width/1.96, this.mapInfo.height / 1.73];
        this.mapInfo.projection = d3.geo.kavrayskiy7()
                    .scale(this.mapInfo.scale)
                    .translate([this.mapInfo.offset[0], this.mapInfo.offset[1]])
                    .precision(.1);
        this.mapInfo.path = d3.geo.path()
                    .projection(this.mapInfo.projection);
        this.mapInfo.disabledColor = 'rgb(220,220,200)';
        // note: right now this normalizes to max of ALL queries
        var maxCounts = this.collection.map(function(queryModel){
            var tagCountModels = queryModel.get('results').get('tagcounts').models;
            return d3.max(tagCountModels, function (tagCountModel) { return tagCountModel.get('count') });
        });
        this.mapInfo.maxCount = d3.max(maxCounts);
        // complicated scale setup to make log chloropleth work
        this.mapInfo.scale1 = d3.scale.linear()
            .domain([0, this.mapInfo.maxCount]).range([1,100]);
        this.mapInfo.scale2 = d3.scale.log() 
            .domain([1,100]).range([0.1,0.9]);
        this.mapInfo.scale3 = d3.scale.linear()
            .domain([0, 0.17, 0.34, 0.51, 0.68, 0.85, 1]) 
            .range(colorbrewer.Oranges[7]); 
        // set up the polygon lookups
        this.mapInfo.countryPaths = topojson.feature(App.worldMap, App.worldMap.objects.countries).features;
        this.mapInfo.countryAlpha3ToPath = {};
        $.each(this.mapInfo.countryPaths, function (i, element) {
            if(element.id>0){
                that.mapInfo.countryAlpha3ToPath[ISO3166.getAlpha3FromId(element.id)] = element;
            }
        });
        // change colors live in response to user
        this.listenTo(this.collection, 'mm:colorchange', function(queryModel) {
            that.$el.find("#map-query"+queryModel.get("queryUid")+" .map-title").stlye("color",queryModel.getColor());
        });
        // add one map for each query
        this.collection.map(function(queryModel) {
            // create map wrapper
            var models = queryModel.get('results').get('tagcounts').models;
            var mapContainer = d3.select(that.$el.find('.viz')[0])
                .append('div').classed("map",true)
                .attr('id','map-query'+queryModel.get('queryUid'));
            mapContainer.append('h3')
                .classed('map-title',true)
                .style('color',queryModel.getColor())
                .text(queryModel.getName());
            var svgMap = mapContainer.append("svg")
                    .attr("width", that.mapInfo.width)
                    .attr("height", that.mapInfo.height);
            var mapDetails = mapContainer.append("div")
                    .classed('map-info-box',true)
                    .append("i")
                    .text("rollover a country for details");
            svgMap.append('g').attr('id', 'background');
            svgMap.append('g').attr('id', 'tagcounts');
            // create the map outlines
            var country = svgMap.select('#background').selectAll(".country").data(that.mapInfo.countryPaths);
            country.enter().append("path")
                .attr("class", 'country')
                .attr("stroke-width", "1")
                .attr("stroke", "rgb(255,255,255)")
                .attr("fill", 'rgb(204,204,204)')
                .on("click", function (d) { return that.handleInvalidCountryClick(d); })
                .attr("d", that.mapInfo.path);
            // render the country data
            var g = svgMap.select('#tagcounts')
                .selectAll('country')
                .data(models, function (tagCountModel) { return tagCountModel.get('id'); });
            g.enter()
                .append("path")
                .attr("class", "country")
                .attr("fill", that.mapInfo.disabledColor)
                .attr("id", function (tagCountModel,i) {return "country"+tagCountModel.get('id')})
                .style('cursor','pointer')
                .attr("d", function (tagCountModel) { 
                    var countryOutline = that.mapInfo.countryAlpha3ToPath[tagCountModel.get('alpha3').toLowerCase()];
                    return that.mapInfo.path(countryOutline);
                })
                .on("click", function (tagCountModel) { return that.handleCountryClick(tagCountModel); })
                .on("mouseover", function (tagCountModel) {return that.handleMouseOver(tagCountModel); })
                .on("mouseout", function (tagCountModel) {return that.handleMouseOut(tagCountModel); });
            g.attr("stroke-width", "1")
                .attr("stroke", "rgb(255,255,255)")
            g.transition()
                .attr("fill", function(tagCountModel) { 
                    return that.mapInfo.scale3(that.mapInfo.scale2(
                        that.mapInfo.scale1(tagCountModel.get('count'))));
                } )
                .attr("stroke", "rgb(255,255,255)")
                .style("opacity", "1");
        });
        this.$el.find('.loading').hide();
        this.$el.find('.viz').show();
        // clean up and prep for display
        var downloadInfo = this.collection.map(function(tagCountModel) { 
            return {
                'url':tagCountModel.get('results').get('tagcounts').csvUrl(),
                'name':tagCountModel.getName()
            };
        });
        this.resetDownloadMenuItems(downloadInfo);
        this.delegateEvents();
        this.showActionMenu();
    },
    handleInvalidCountryClick: function(tagCountModel){
        App.debug("Clicked on invalid country!");
    },
    handleCountryClick: function(tagCountModel){
        ga('send', 'event', 'query', 'refine', 'geography', '');
        this.collection.refine.trigger('mm:refine',{ term: "(tags_id_story_sentences:"+tagCountModel.get('tags_id')+")" });
    },
    handleMouseOver: function(tagCountModel){
        var countryId = tagCountModel.get('id');
        var countryName = tagCountModel.get('label');
        var that = this;
        this.collection.map(function(queryModel) {
            var tcm = queryModel.get('results').get('tagcounts').get(countryId);
            var count = (tcm==null) ? '0' : (tcm.get('count')*100).toFixed(2)+"%";
            var content = that.rolloverTemplate({'color': queryModel.getColor(), 
                'queryName':queryModel.getName(), 'country':countryName, 'count':count});
            that.$el.find("#map-query"+queryModel.get("queryUid")+" .map-info-box").html(content);
        });
    },
    handleMouseOut: function(tagCountModel){
        this.$el.find(".map-info-box").html("");        
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        ga('send', 'event', 'about', 'view', 'geographic', '');
        this.aboutView = new App.AboutView({
            template: '#tpl-about-country-map-view'
        });
        $('body').append(this.aboutView.el);
    }
});
App.CountryMapView = App.CountryMapView.extend(App.ActionedViewMixin);

App.QueryResultView = App.NestedView.extend({
    name: 'QueryResultView',
    tagName: 'div',
    id: 'query-results',
    initialize: function (options) {
        App.debug('App.QueryResultView.initialize():' + this.cid);
        this.summaryView = new App.SummaryView(options);
        this.histogramView = new App.HistogramView(options);
        this.wordCountView = new App.WordCountView(options);
        if(App.con.userModel.canListSentences()){
            this.mentionsView = new App.SentenceView(options);
        } else {
            this.mentionsView = new App.StoryView(options);
        }
        this.countryMapView = new App.CountryMapView(options);
        this.addSubView(this.summaryView);
        this.addSubView(this.histogramView);
        this.addSubView(this.wordCountView);
        this.addSubView(this.mentionsView);
        this.addSubView(this.countryMapView);
        this.render();
    },
    render: function () {
        // Reset and render views
        this.$el.html('');
        this.$el.append(this.summaryView.$el);
        this.$el.append(this.histogramView.$el);
        this.$el.append(this.wordCountView.$el);
        this.$el.append(this.mentionsView.$el);
        this.$el.append(this.countryMapView.$el);
    }
});
