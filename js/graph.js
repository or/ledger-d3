function load() {
    var width;
    var height;
    var graph_element_id = "#graph";

    var svg = d3.select(graph_element_id)
        .append("svg");
    var graph;
    var data;

    var x = d3.scaleTime();
    var y = d3.scaleLinear();
    var xAxis, yAxis;
    var gX, gY;

    var day = d3.timeFormat("%Y-%m-%d");

    var line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.cumulative_sum); });

    function zoomed() {
        graph.attr("transform", d3.event.transform);

        gX.call(xAxis.scale(d3.event.transform.rescaleX(x)));
        gY.call(yAxis.scale(d3.event.transform.rescaleY(y)));
    }

    var zoom;

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var resize = function() {
        width = $(graph_element_id).width();
        height = $(graph_element_id).height();

        svg.attr("width", width)
           .attr("height", height);
    };

    var graphObj = {};

    var oldOnResize = d3.select(window).on("resize");

    var colorRange =  [
        "#1395ba",
        "#c02e1d",
        "#f16c20",
        "#ebc844",
        "#a2b86c",
        "#0d3c55",
    ];
    colorRange = colorRange.concat(d3.schemeCategory20c);
    var colorIndex = 0;
    var colorMap = {};

    var pickColor = function(name) {
        if (!(name in colorMap)) {
            colorMap[name] = colorIndex;
            colorIndex = (colorIndex + 1) % colorRange.length;
        }

        return colorRange[colorMap[name]];
    };

    d3.select(window).on("resize", function() {
        if (typeof(oldOnResize) != "undefined") {
            oldOnResize();
        }
        graphObj.onResize();
    });

    graphObj.onResize = function() {
        resize();
        graphObj.update();
    };

    graphObj.load = function(path) {
        console.log("load...");
        d3.json(path, function(raw_data) {
            data = [];
            var nameMap = {};
            raw_data.forEach(function(d) {
                if (!(d.commodity in nameMap)) {
                    nameMap[d.commodity] = {
                        key: d.commodity,
                        cumulative_sum: 0,
                        last: null,
                        values: []
                    };
                }
                var tmp = nameMap[d.commodity];

                d.date = new Date(d.date);

                if (tmp.last == null || day(tmp.last.date) != day(d.date)) {
                    tmp.last = {
                        date: d.date,
                        amount: 0,
                        cumulative_sum: 0,
                        transactions: []
                    };
                    tmp.values.push(tmp.last);
                }

                d.amount = parseFloat(d.amount);
                tmp.cumulative_sum += d.amount;
                tmp.last.amount += d.amount;
                tmp.last.cumulative_sum = tmp.cumulative_sum;
                tmp.last.transactions.push(d);
            });

            data = Object.values(nameMap);
            graphObj.update();
        });
    };

    graphObj.update = function() {
        if (data === null) {
            return;
        }

        console.log(data);
        var xRange = [
            d3.min(data, function(d) {
                return d3.min(d.values, function(e) {
                    return e.date;
                });
            }),
            d3.max(data, function(d) {
                return d3.max(d.values, function(e) {
                    return e.date;
                });
            })
        ];
        var yRange = [
            d3.min(data, function(d) {
                return d3.min(d.values, function(e) {
                    return e.cumulative_sum;
                });
            }),
            d3.max(data, function(d) {
                return d3.max(d.values, function(e) {
                    return e.cumulative_sum;
                });
            })
        ];

        var timelineWidth = (xRange[1] - xRange[0]) / 24 / 60 / 60 / 1000;
        if (timelineWidth < width) {
            timelineWidth = width;
        }
        x
            .domain(xRange)
            .range([0, timelineWidth]);

        y
            .domain(yRange)
            .range([height, 0]);

        console.log(xRange, yRange, timelineWidth);

        svg.selectAll("g").remove();
        xAxis = d3.axisBottom(x)
            .ticks(d3.timeMonth.every(1))
            .tickFormat(d3.timeFormat("%b %Y"));
        yAxis = d3.axisLeft(y);

        gX = svg.append("g")
            .attr("class", "axis axis--x")
            .call(xAxis);
        gY = svg.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(" + width + " ,0)")
            .call(yAxis);

        var minZoom = 0.1;
        zoom = d3.zoom()
            .scaleExtent([minZoom, 40])
            .translateExtent([[(-10 - width) / minZoom, -100 / minZoom],
                              [(timelineWidth + width + 10) / minZoom, (height + 100) / minZoom]])
            .on("zoom", zoomed);

        graph = svg.append("g")
            .attr("class", "graph");

        graphObj.update_data();
        svg.call(zoom);
    };

    graphObj.update_data = function() {
        console.log("rendering...");
        graph.selectAll(".line")
            .data(data)
            .enter()
            .append("path")
            .style("pointer-events", "none")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke-width", 1)
            .attr("stroke", function(d) { return pickColor(d.key); })
            .attr("d", function(d) { return line(d.values); })
        ;
    };

    resize();

    graphObj.load("/data/assets.json");

    return graphObj;
}
