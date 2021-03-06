define([
        "dojo/_base/declare",
        "dojo/_base/kernel",
        "dojo/_base/lang",
        "esri/arcgis/utils",
        "dojo/json",
        "dojo/dom-construct",
        "dojo/dom",
        "dojo/on",
        "dojo/dom-style",
        "dojo/dom-attr",
        "dojo/dom-class",
        "esri/dijit/LayerList",
        "application/ShareDialog",
        "application/Drawer",
        "application/DrawerMenu",
        "application/SearchSources",
        "esri/dijit/HomeButton",
        "esri/dijit/LocateButton",
        "esri/dijit/BasemapToggle",
        "esri/dijit/Search",
        "esri/dijit/Popup",
        "esri/dijit/Legend",
        "application/About",
        "application/SocialLayers",
        "esri/dijit/OverviewMap",
        "dijit/registry",
        "dojo/_base/array",
        "esri/dijit/Print",
        "dojo/_base/connect"
    ],
    function (declare,
              kernel,
              lang,
              arcgisUtils,
              JSON,
              domConstruct,
              dom,
              on,
              domStyle,
              domAttr,
              domClass,
              LayerList, ShareDialog, Drawer, DrawerMenu, SearchSources,
              HomeButton, LocateButton, BasemapToggle,
              Search,
              Popup,
              Legend,
              About,
              SocialLayers,
              OverviewMap,
              registry,
              array,
              Print, connect) {
        return declare("", [About, SocialLayers], {
            config: {},
            constructor: function () {
                // css classes
                this.css = {
                    mobileSearchDisplay: "mobile-locate-box-display",
                    toggleBlue: 'toggle-grey',
                    toggleBlueOn: 'toggle-grey-on',
                    panelPadding: "panel-padding",
                    panelContainer: "panel-container",
                    panelHeader: "panel-header",
                    panelSection: "panel-section",
                    panelSummary: "panel-summary",
                    panelDescription: "panel-description",
                    panelModified: "panel-modified-date",
                    panelViews: "panel-views-count",
                    panelMoreInfo: "panel-more-info",
                    pointerEvents: "pointer-events",
                    iconRight: "icon-right",
                    iconList: "icon-list",
                    iconLayers: "icon-layers",
                    iconAbout: "icon-info-circled-1",
                    iconClosure:"icon-attention-1",
                    iconRoute: "icon-direction",
                    iconText: "icon-text",
                    locateButtonTheme: "LocateButtonCalcite",
                    homebuttonTheme: "HomeButtonCalcite",
                    desktopGeocoderTheme: "geocoder-desktop",
                    mobileGeocoderTheme: "geocoder-mobile",
                    appLoading: "app-loading",
                    appError: "app-error",
                    layerlistToggleThem: "layerListToggleCalcite"
                };
                // pointer event support
                if (this._pointerEventsSupport()) {
                    domClass.add(document.documentElement, this.css.pointerEvents);
                }
                // mobile size switch domClass
                this._showDrawerSize = 850;
            },
            startup: function (config) {

                document.documentElement.lang = kernel.locale;

                // config will contain application and user defined info for the template such as i18n strings, the web map id
                // and application id
                // any url parameters and any application specific configuration information.
                if (config) {
                    //config will contain application and user defined info for the template such as i18n strings, the web map id
                    // and application id
                    // any url parameters and any application specific configuration information.
                    this.config = config;
                    // drawer
                    this._drawer = new Drawer({
                        showDrawerSize: this._showDrawerSize,
                        borderContainer: 'bc_outer',
                        contentPaneCenter: 'cp_outer_center',
                        contentPaneSide: 'cp_outer_left',
                        toggleButton: 'hamburger_button'
                    });
                    // drawer resize event
                    on(this._drawer, 'resize', lang.hitch(this, function () {
                        // check mobile button status
                        this._checkMobileGeocoderVisibility();
                    }));
                    // startup drawer
                    this._drawer.startup();
                    //supply either the webmap id or, if available, the item info
                    var itemInfo = this.config.itemInfo || this.config.webmap;
                    this._createWebMap(itemInfo);
                } else {
                    var error = new Error("Main:: Config is not defined");
                    this.reportError(error);
                }
            },
            reportError: function (error) {
                // remove spinner
                this._hideLoadingIndicator();
                // add app error
                domClass.add(document.body, this.css.appError);
                // set message
                var node = dom.byId('error_message');
                if (node) {
                    if (this.config && this.config.i18n) {
                        node.innerHTML = this.config.i18n.map.error + ": " + error.message;
                    } else {
                        node.innerHTML = "Unable to create map: " + error.message;
                    }
                }
            },
            // if pointer events are supported
            _pointerEventsSupport: function () {
                var element = document.createElement('x');
                element.style.cssText = 'pointer-events:auto';
                return element.style.pointerEvents === 'auto';
            },
            _initLegend: function () {
                var legendNode = dom.byId('LegendDiv');
                if (legendNode) {
                    this._mapLegend = new Legend({
                        map: this.map,
                        layerInfos: this.layerInfos
                    }, legendNode);
                    this._mapLegend.startup();
                }
            },
            _initTOC: function () {
                // layers
                var tocNode = dom.byId('LayerList'),
                    socialTocNode, tocLayers, socialTocLayers, toc, socialToc;
                if (tocNode) {
                    tocLayers = this.layers;
                    toc = new LayerList({
                        map: this.map,
                        layers: tocLayers
                    }, tocNode);
                    toc.startup();
                    if (this._mapLegend) {
                        on(toc, "toggle", lang.hitch(this, function () {
                            this._mapLegend.refresh();
                        }));
                    }
                }
                // if we have social layers
                if (this.socialLayers && this.socialLayers.length) {
                    // add social specific html
                    var content = '';
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.social.mediaLayers + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '<div class="' + this.css.panelDescription + '">' + this.config.i18n.social.mediaLayersDescription + '</div>';
                    content += '<div id="MediaLayerList"></div>';
                    content += '</div>';
                    // get node to insert
                    var node = dom.byId('social_media_layers');
                    if (node) {
                        node.innerHTML = content;
                    }
                    // get toc node for social layers
                    socialTocNode = dom.byId('MediaLayerList');
                    // if node exists
                    if (socialTocNode) {
                        socialTocLayers = this.socialLayers;
                        socialToc = new LayerList({
                            map: this.map,
                            layers: socialTocLayers
                        }, socialTocNode);
                        socialToc.startup();
                        if (this._mapLegend) {
                            on(socialToc, "toggle", lang.hitch(this, function () {
                                this._mapLegend.refresh();
                            }));
                        }
                        this._socialToc = socialToc;
                    }
                }
            },
            _initClosurePanel: function () {
                require(["esri/layers/FeatureLayer",
                        "esri/dijit/FeatureTable",
                        "esri/graphic",
                        "esri/tasks/query"],
                    lang.hitch(this, function (FeatureLayer, FeatureTable, Graphic, Query) {
                        var content = '';
                        //content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.sidewalkClosure.mediaLayers + '</div>';
                        //content += '<div class="' + this.css.panelContainer + '">';
                        content += '<img src=\'images/closureLegend/redLine.png\'>' + '   Road-Closed';
                        content += '<br />' + '<img src=\'images/closureLegend/organeline.png\'>' + '   Sidewalk-Closed';
                        content += '<br />';
                        content += '<div class="' + this.css.panelDescription + '">' + this.config.i18n.sidewalkClosure.general + '</div>';
                        content += '<div id="closureInfoTable"></div>';
                        content += '</div>';
                        var node = dom.byId('sidewalk_closure_info');
                        if (node) {
                            //console.log('find sidewalk closure info div');
                            node.innerHTML = content;
                        }
                        //add feature table
                        var sidewalkClosure = new FeatureLayer("https://services1.arcgis.com/DwLTn0u9VBSZvUPe/arcgis/rest/services/SidewalkClosure/FeatureServer/0", {
                            outFields: ['Name', 'End_Date', 'Reason_of_Closure']
                        });

                        var tableNode = dom.byId('closureInfoTable');
                        var closureInfoTable = new FeatureTable({
                            featureLayer: sidewalkClosure,
                            map: this.map,
                            editable: false,
                            outFields: ['Name', 'End_Date', 'Reason_of_Closure']
                        }, tableNode);
                        closureInfoTable.startup();
                        this._closureInfoTable = closureInfoTable;
                        this._sidewalkClosure = sidewalkClosure;
                    }));
            },
            _initNewAboutPanel: function () {
                var socialTocNode, socialTocLayers, socialToc;
                // if we have social layers
                if (this.socialLayers && this.socialLayers.length) {
                    // add social specific html
                    var content = '';
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.social.mediaLayers + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '<div class="' + this.css.panelDescription + '">' + this.config.i18n.social.mediaLayersDescription + '</div>';
                    content += '<div id="MediaLayerList"></div>';
                    content += '</div>';
                    // get node to insert
                    var node = dom.byId('social_media_layers');
                    if (node) {
                        node.innerHTML = content;
                    }
                    // get toc node for social layers
                    socialTocNode = dom.byId('MediaLayerList');
                    // if node exists
                    if (socialTocNode) {
                        socialTocLayers = this.socialLayers;
                        socialToc = new LayerList({
                            map: this.map,
                            layers: socialTocLayers
                        }, socialTocNode);
                        socialToc.startup();
                        if (this._mapLegend) {
                            on(socialToc, "toggle", lang.hitch(this, function () {
                                this._mapLegend.refresh();
                            }));
                        }
                        this._socialToc = socialToc;
                    }
                }

            },
            _initRoutePanel: function () {
                require(["esri/dijit/Directions",
                        "esri/tasks/FeatureSet",
                        "esri/tasks/RouteParameters",
                        "esri/layers/FeatureLayer",
                        "esri/tasks/query",
                        "dijit/form/Button"
                    ],
                    lang.hitch(this, function (Directions, FeatureSet,
                                               RouteParameters, FeatureLayer,
                                               Query, Button) {


                        var dir_div = domConstruct.create("div", {
                            className: "panel_content"
                        }, dom.byId("dirDiv"));

                        var walkability = new FeatureLayer("https://services1.arcgis.com/DwLTn0u9VBSZvUPe/arcgis/rest/services/SIDEWALK_NAMED/FeatureServer/0", {
                            mode: FeatureLayer.MODE_SELECTION,
                            outFields: ["*"]
                        });


                        var directions = new Directions({
                            map: this.map,
//                    routeTask: new RouteTask("http://env-gis-srv1.uwaterloo.ca:6080/arcgis/rest/services/w16_s72zhang/natutorial/NAServer/Route"),
//                    routeTaskUrl: "http://env-gis-srv1.uwaterloo.ca:6080/arcgis/rest/services/w16_s72zhang/natutorial2/NAServer/Route",
                            routeTaskUrl: "http://rhea.uwaterloo.ca:6080/arcgis/rest/services/kitchenerSidewalks/Network_NamedSidewalk/NAServer/Route",
                            showClearButton: true,
                            directionsLengthUnits: "esriKilometers",
//                    showTravelModesOption: true,
//                    routeParams: routeParams,
                        }, dir_div);
                        directions.routeParams = new RouteParameters();
                        directions.routeParams.barriers = new FeatureSet();
                        directions.routeParams.polylineBarriers = new FeatureSet();
                        directions.routeParams.outSpatialReference = {"wkid": 102100};
                        directions.startup();


                        //var category_div = domConstruct.create("div", {
                        //    className: "panel_content"
                        //}, dom.byId("categoryDiv"));
                        var category_div = dom.byId("categoryDiv");

                        //add category selection choices
                        var button_ableBodied = new Button({
                            label: "Able Bodied",
                            showLabel: false,
                            iconClass: 'myIconAbleBodied',
                            onClick: function () {
                                // Do something:
                                dom.byId("categoryDesc").innerHTML = "You've chosen able bodied category";
                                if (directions.routeParams.polylineBarriers) {
                                    directions.routeParams.polylineBarriers = new FeatureSet();
                                }
                            }
                        });
                        button_ableBodied.startup();
                        button_ableBodied.placeAt(category_div);

                        var button_walkstick = new Button({
                            label: "cane",
                            showLabel: false,
                            iconClass: 'myIconWalkStick',
                            onClick: function () {
                                // Do something:
                                dom.byId("categoryDesc").innerHTML = "You've chosen cane category";
                                if (directions.routeParams.polylineBarriers) {
                                    directions.routeParams.polylineBarriers = new FeatureSet();
                                }
                                var selectQuery = new Query();
                                selectQuery.where = "Slope_Type = 'Steep' OR Slope_Type = 'Very Steep' OR Width_New < 0.75";
                                //addPolyLineBarriers(selectQuery);
                                walkability.selectFeatures(selectQuery, FeatureLayer.SELECTION_NEW, function (results) {
                                    for (var i = 0; i < results.length; i++) {
                                        barrierLine = results[i];
                                        directions.routeParams.polylineBarriers.features.push(barrierLine);
                                    }
                                    console.log(directions.routeParams.polylineBarriers.features);
                                });
                                //console.log(directions.routeParams.polylineBarriers.features.length);
                            }
                        });
                        button_walkstick.startup();
                        button_walkstick.placeAt(category_div);


                        var button_wheelchair = new Button({
                            label: "wheelchair",
                            showLabel: false,
                            iconClass: 'myIconWheelChair',
                            onClick: function () {
                                // Do something:
                                dom.byId("categoryDesc").innerHTML = "You've chosen wheelchair category";
                                if (directions.routeParams.polylineBarriers) {
                                    directions.routeParams.polylineBarriers = new FeatureSet();
                                }
                                var selectQuery = new Query();
                                selectQuery.where = "Slope_Type <> 'flat' OR Width_New < 1";
                                //addPolyLineBarriers(selectQuery);
                                walkability.selectFeatures(selectQuery, FeatureLayer.SELECTION_NEW, function (results) {
                                    for (var i = 0; i < results.length; i++) {
                                        barrierLine = results[i];
                                        directions.routeParams.polylineBarriers.features.push(barrierLine);
                                    }
                                    console.log(directions.routeParams.polylineBarriers.features);
                                });
                                //console.log(directions.routeParams.polylineBarriers.features.length);
                            }
                        });
                        button_wheelchair.startup();
                        button_wheelchair.placeAt(category_div);

                        var button_mwheelchair = new Button({
                            label: "motor wheelchair",
                            showLabel: false,
                            iconClass: 'myIconMWheelChair',
                            onClick: function () {
                                // Do something:
                                dom.byId("categoryDesc").innerHTML = "You've chosen motor wheelchair category";
                                if (directions.routeParams.polylineBarriers) {
                                    directions.routeParams.polylineBarriers = new FeatureSet();
                                }
                                var selectQuery = new Query();
                                selectQuery.where = "Slope_Type = 'Very Steep' OR Width_New < 1.5";
                                //addPolyLineBarriers(selectQuery);
                                walkability.selectFeatures(selectQuery, FeatureLayer.SELECTION_NEW, function (results) {
                                    for (var i = 0; i < results.length; i++) {
                                        barrierLine = results[i];
                                        directions.routeParams.polylineBarriers.features.push(barrierLine);
                                    }
                                    console.log(directions.routeParams.polylineBarriers.features);
                                });
                                //console.log(directions.routeParams.polylineBarriers.features.length);
                            }
                        });
                        button_mwheelchair.startup();
                        button_mwheelchair.placeAt(category_div);
                    }));

            },
            _init: function () {
                // menu panels
                this.drawerMenus = [];
                var content, menuObj;
                // map panel enabled
                if (this.config.enableAboutPanel) {
                    content = '';
                    content += '<div class="' + this.css.panelContainer + '">';
                    // if summary enabled
                    if (this.config.enableSummaryInfo) {
                        content += '<div class="' + this.css.panelHeader + '">' + this.config.title + '</div>';
                        content += '<div class="' + this.css.panelSummary + '" id="summary"></div>';
                        if (this.config.enableModifiedDate) {
                            content += '<div class="' + this.css.panelModified + '" id="date_modified"></div>';
                        }
                        if (this.config.enableViewsCount) {
                            content += '<div class="' + this.css.panelViews + '" id="views_count"></div>';
                        }
                        if (this.config.enableMoreInfo) {
                            content += '<div class="' + this.css.panelMoreInfo + '" id="more_info_link"></div>';
                        }
                    }
                    // show notes layer and has one of required things for getting notes layer
                    if (this.config.notesLayer && this.config.notesLayer.id) {
                        content += '<div id="map_notes_section">';
                        content += '<div class="' + this.css.panelHeader + '"><span id="map_notes_title">' + this.config.i18n.general.featured + '</span></div>';
                        content += '<div class="' + this.css.panelSection + '" id="map_notes"></div>';
                        content += '</div>';
                    }
                    // show bookmarks and has bookmarks
                    if (this.config.enableBookmarks && this.bookmarks && this.bookmarks.length) {
                        content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.mapNotes.bookmarks + '</div>';
                        content += '<div class="' + this.css.panelSection + '" id="map_bookmarks"></div>';
                    }
                    content += '</div>';
                    // menu info
                    menuObj = {
                        title: this.config.i18n.general.about,
                        label: '<div class="' + this.css.iconAbout + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.about + '</div>',
                        content: content
                    };
                    // map menu
                    if (this.config.defaultPanel === 'about') {
                        this.drawerMenus.splice(0, 0, menuObj);
                    } else {
                        this.drawerMenus.push(menuObj);
                    }
                }
                if (this.config.enableLegendPanel) {
                    content = '';
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.legend + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '<div class="' + this.css.panelPadding + '">';
                    content += '<div id="twitter_legend_auth"></div>';
                    content += '<div id="social_media_layers"></div>';
                    menuObj = {
                        title: this.config.i18n.general.legend,
                        label: '<div class="' + this.css.iconList + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.legend + '</div>',
                        content: content
                    };
                    // legend menu
                    if (this.config.defaultPanel === 'legend') {
                        this.drawerMenus.splice(0, 0, menuObj);
                    } else {
                        this.drawerMenus.push(menuObj);
                    }
                }
                // Layers Panel
                if (this.config.enableLayersPanel) {
                    content = '';
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.layers + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '<div id="LayerList"></div>';
                    content += '</div>';
                    // menu info
                    menuObj = {
                        title: this.config.i18n.general.layers,
                        label: '<div class="' + this.css.iconLayers + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.layers + '</div>',
                        content: content
                    };
                    // layers menu
                    if (this.config.defaultPanel === 'layers') {
                        this.drawerMenus.splice(0, 0, menuObj);
                    } else {
                        this.drawerMenus.push(menuObj);
                    }
                }
                if (this.config.enableNewAboutPanel) {
                    content = '';
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.aboutApp + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '<div class="' + this.css.panelDescription + '">' + this.config.i18n.about.appDescription + '</div>';
                    content += '<div id="social_media_layers"></div>';
                    content += '</div>';
                    // menu info
                    menuObj = {
                        title: this.config.i18n.general.aboutApp,
                        label: '<div class="' + this.css.iconAbout + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.aboutApp + '</div>',
                        content: content
                    };
                    // layers menu
                    if (this.config.defaultPanel === 'layers') {
                        this.drawerMenus.splice(0, 0, menuObj);
                    } else {
                        this.drawerMenus.push(menuObj);
                    }
                }
                if (this.config.enableClosureinfoPanel) {
                    content = '';
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.closureinfo + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '</div>';
                    content += '<div id ="sidewalk_closure_info"></div>';

                    // menu info
                    menuObj = {
                        title: this.config.i18n.general.closureinfo,
                        label: '<div class="' + this.css.iconClosure + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.closureinfo + '</div>',
                        content: content
                    };
                    // layers menu
                    if (this.config.defaultPanel === 'layers') {
                        this.drawerMenus.splice(0, 0, menuObj);
                    } else {
                        this.drawerMenus.push(menuObj);
                    }
                }
                if (this.config.enableRoutePanel) {
                    content = '';
                    content += '<div class=' + this.css.panelHeader + '">' + this.config.i18n.general.route + '</div>';
                    content += '<div class="' + this.css.panelContainer + '">';
                    content += '<div class="' + this.css.panelDescription + '">' + this.config.i18n.route.Description + '</div>';
                    content += '<div id="categoryDiv"></div>';
                    content += '<div id="categoryDesc"></div>';
                    content += '<div id="dirDiv"></div>';
                    content += '</div>';
                    menuObj = {
                        title: this.config.i18n.general.route,
                        label: '<div class="' + this.css.iconRoute + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.route + '</div>',
                        content: content
                    };
                    // layers menu
                    if (this.config.defaultPanel === 'route') {
                        this.drawerMenus.splice(0, 0, menuObj);
                    } else {
                        this.drawerMenus.push(menuObj);
                    }
                }
                // menus
                this._drawerMenu = new DrawerMenu({
                    menus: this.drawerMenus
                }, dom.byId("drawer_menus"));
                this._drawerMenu.startup();
                // locate button
                if (this.config.enableLocateButton) {
                    this._LB = new LocateButton({
                        map: this.map,
                        theme: this.css.locateButtonTheme
                    }, 'LocateButton');
                    this._LB.startup();
                }
                // home button
                if (this.config.enableHomeButton) {
                    this._HB = new HomeButton({
                        map: this.map,
                        theme: this.css.homebuttonTheme
                    }, 'HomeButton');
                    this._HB.startup();
                    // clear locate on home button
                    on(this._HB, 'home', lang.hitch(this, function () {
                        if (this._LB) {
                            this._LB.clear();
                        }
                    }));
                }
                //Layerlist toggle
                if (this.config.enableLayerlistToggle) {
                    require(["esri/dijit/LayerList", "dijit/TitlePane"], lang.hitch(this, function (LayerList, TitlePane) {
                        this._layerTP = new TitlePane({
                            title: "Layer List",
                            //theme: this.css.layerlistToggleTheme,
                            open: false
                        });
                        dom.byId("layerlistDiv").appendChild(this._layerTP.domNode);
                        this._layerTP.startup();
                        //var layerInfo = arcgisUtils.getLayerList(this.config.response);
                        //if (layerInfo.length > 0) {
                        var layerList = new LayerList({
                            map: this.map,
                            showLegend: true,
                            showSubLayers: false,
                            showOpacitySlider: true,
                            layers: this.layers
                            //layerInfos: this.layerInfos
                        }).placeAt(this._layerTP.containerNode);
                        layerList.startup();
                        //}
                    }));
                }
                // basemap toggle
                if (this.config.enableBasemapToggle) {
                    var BT = new BasemapToggle({
                        map: this.map,
                        basemap: this.config.nextBasemap,
                        defaultBasemap: this.config.defaultBasemap
                    }, 'BasemapToggle');
                    BT.startup();
                    /* Start temporary until after JSAPI 4.0 is released */
                    var bmLayers = [],
                        mapLayers = this.map.getLayersVisibleAtScale(this.map.getScale());
                    if (mapLayers) {
                        for (var i = 0; i < mapLayers.length; i++) {
                            if (mapLayers[i]._basemapGalleryLayerType) {
                                var bmLayer = this.map.getLayer(mapLayers[i].id);
                                if (bmLayer) {
                                    bmLayers.push(bmLayer);
                                }
                            }
                        }
                    }
                    on.once(this.map, 'basemap-change', lang.hitch(this, function () {
                        if (bmLayers && bmLayers.length) {
                            for (var i = 0; i < bmLayers.length; i++) {
                                bmLayers[i].setVisibility(false);
                            }
                        }
                    }));
                    /* END temporary until after JSAPI 4.0 is released */
                }
                if (this.config.enablePrintButton) {
                    this._printer = new Print({
                        map: this.map,
                        url: this.config.helperServices.printTask.url
                    }, dom.byId("printButton"));
                    this._printer.startup();
                }
                // share dialog
                if (this.config.enableShareDialog) {
                    this._ShareDialog = new ShareDialog({
                        theme: this.css.iconRight,
                        bitlyLogin: this.config.bitlyLogin,
                        bitlyKey: this.config.bitlyKey,
                        map: this.map,
                        image: this.config.sharinghost + '/sharing/rest/content/items/' + this.item.id + '/info/' + this.item.thumbnail,
                        title: this.config.title,
                        summary: this.item.snippet,
                        hashtags: 'esriPIM'
                    }, 'ShareDialog');
                    this._ShareDialog.startup();
                }
                // i18n overview placement
                var overviewPlacement = 'left';
                if (this.config.i18n.direction === 'rtl') {
                    overviewPlacement = 'right';
                }
                // Overview Map
                if (this.config.enableOverviewMap) {
                    var size = this._getOverviewMapSize();
                    this._overviewMap = new OverviewMap({
                        attachTo: "bottom-" + overviewPlacement,
                        width: size,
                        height: size,
                        visible: this.config.openOverviewMap,
                        map: this.map
                    });
                    this._overviewMap.startup();
                    // responsive overview size
                    on(this.map, 'resize', lang.hitch(this, function () {
                        this._resizeOverviewMap();
                    }));
                }
                // geocoders
                this._createGeocoders();
                // startup social
                this.initSocial();
                // startup map panel
                //this.initAboutPanel();
                this._initNewAboutPanel();
                // startup legend
                //this._initLegend();
                // startup toc
                //this._initTOC();
                //startup routePanel
                this._initClosurePanel();
                this._initRoutePanel();
                this.configureSocial();
                this._defineSidewalkClosureLayer();
                // on body click containing underlay class
                on(document.body, '.dijitDialogUnderlay:click', function () {
                    // get all dialogs
                    var filtered = array.filter(registry.toArray(), function (w) {
                        return w && w.declaredClass == "dijit.Dialog";
                    });
                    // hide all dialogs
                    array.forEach(filtered, function (w) {
                        w.hide();
                    });
                });

                on(this.map, "extent-change", lang.hitch(this, function (evt) {
                    require(["esri/layers/FeatureLayer",
                            "esri/dijit/FeatureTable",
                            "esri/graphic",
                            "esri/tasks/query"],
                        lang.hitch(this, function (FeatureLayer, FeatureTable, Graphic, Query) {
                            var extent = evt.extent;
                            //console.log("map extent changed");
                            //console.log(this.map);
                            var selectQuery = new Query();
                            selectQuery.geometry = extent;
                            this._selectedSidewalkClosure.clear();
                            var temp = this._selectedSidewalkClosure;
                            console.log(temp);


                            this._sidewalkClosure.selectFeatures(selectQuery, FeatureLayer.SELECTION_NEW, function (results) {
                                //console.log(results);
                                temp.applyEdits(results, null, null);
                            });


                            var tableNode = dom.byId('closureInfoTable');
                            if (tableNode) {
                                //console.log(tableNode.parentNode);
                                tableNode.parentNode.removeChild(tableNode);
                            }
                            var newTableNode = domConstruct.create("div", {
                                //className: "panel_content",
                                id: 'closureInfoTable'
                            }, dom.byId("sidewalk_closure_info"));
                            //console.log(newTableNode);
                            this._closureInfoTable.destroy();

                            var selectedClosureInfoTable = new FeatureTable({
                                featureLayer: this._selectedSidewalkClosure,
                                map: this.map,
                                editable: false,
                                outFields: ['Name', 'End_Date', 'Reason_of_Closure'],
                                zoomToSelection: true,
                                fieldInfos: [
                                    {
                                        name: 'Name',
                                        alias: 'Sidewalk',
                                        editable: false //disable editing on this field
                                    },
                                    {
                                        name: 'End_Date',
                                        alias: 'End Date',
                                        editable: false,
                                        dateOptions: {
                                            datePattern: 'M/d/y',
                                            timeEnabled: true
                                        }
                                    },
                                    {
                                        name: 'Reason_of_Closure',
                                        alias: 'Close Reason',
                                        editable: false
                                    }
                                ],

                            }, newTableNode);
                            selectedClosureInfoTable.startup();
                            console.log(selectedClosureInfoTable.featureLayer);
                            this._closureInfoTable = selectedClosureInfoTable;
                        }));

                }));
                // hide loading div
                this._hideLoadingIndicator();
                // dialog modal
                if (this.config.enableDialogModal) {
                    require(["dijit/Dialog"], lang.hitch(this, function (Dialog) {
                        var dialogContent = this.config.dialogModalContent;
                        var dialogModal = new Dialog({
                            title: this.config.dialogModalTitle || "Access and Use Constraints",
                            content: dialogContent,
                            style: "width: 375px"
                        });
                        dialogModal.show();
                    }));
                }
                // swipe layer
                if (this.config.swipeLayer) {
                    // swipe layers
                    var layers = [];
                    if (lang.isString(this.config.swipeLayer)) {
                        this.config.swipeLayer = JSON.parse(this.config.swipeLayer);
                    }
                    // multiple swipe layers
                    if (lang.isArray(this.config.swipeLayer)) {
                        for (var j = 0; j < this.config.swipeLayer.length; j++) {
                            var lyr = this.map.getLayer(this.config.swipeLayer[j].id);
                            if (lyr) {
                                layers.push(lyr);
                            }
                        }
                    }
                    // one swipe layer
                    else if (this.config.swipeLayer.id) {
                        var layer = this.map.getLayer(this.config.swipeLayer.id);
                        if (layer) {
                            layers.push(layer);
                        }
                    }
                    // we have swipe layers
                    if (layers.length) {
                        // get swipe tool
                        require(["esri/dijit/LayerSwipe"], lang.hitch(this, function (LayerSwipe) {
                            // create swipe
                            var layerSwipe = new LayerSwipe({
                                type: this.config.swipeType,
                                theme: "PIMSwipe",
                                invertPlacement: this.config.swipeInvertPlacement,
                                map: this.map,
                                layers: layers
                            }, "swipeDiv");
                            layerSwipe.startup();
                            // return true if one layer is visible
                            function layerVisible() {
                                var visible = false;
                                for (var k = 0; k < layers.length; k++) {
                                    if (layers[k].visible) {
                                        visible = true;
                                        break;
                                    }
                                }
                                return visible;
                            }

                            // event for visibility change
                            function layerVisEvent(layer) {
                                on(layer, 'visibility-change', lang.hitch(this, function (evt) {
                                    layerSwipe.set("enabled", layerVisible());
                                }));
                            }

                            // events for layer visibility change
                            for (var m = 0; m < layers.length; m++) {
                                layerVisEvent(layers[m]);
                            }
                        }));
                    }
                }
                // drawer size check
                this._drawer.resize();
            },
            _getOverviewMapSize: function () {
                var breakPoint = 500;
                var size = 150;
                if (this.map.width < breakPoint || this.map.height < breakPoint) {
                    size = 75;
                }
                return size;
            },
            _resizeOverviewMap: function () {
                if (this._overviewMap) {
                    var size = this._getOverviewMapSize();
                    if (this._overviewMap.hasOwnProperty('resize')) {
                        this._overviewMap.resize({
                            w: size,
                            h: size
                        });
                    }
                }
            },
            _checkMobileGeocoderVisibility: function () {
                if (this._mobileGeocoderIconNode && this._mobileSearchNode) {
                    // check if mobile icon needs to be selected
                    if (domClass.contains(this._mobileGeocoderIconNode, this.css.toggleBlueOn)) {
                        domClass.add(this._mobileSearchNode, this.css.mobileSearchDisplay);
                    }
                }
            },
            _showMobileGeocoder: function () {
                if (this._mobileSearchNode && this._mobileGeocoderIconContainerNode) {
                    domClass.add(this._mobileSearchNode, this.css.mobileSearchDisplay);
                    domClass.replace(this._mobileGeocoderIconContainerNode, this.css.toggleBlueOn, this.css.toggleBlue);
                }
            },
            _hideMobileGeocoder: function () {
                if (this._mobileSearchNode && this._mobileGeocoderIconContainerNode) {
                    domClass.remove(this._mobileSearchNode, this.css.mobileSearchDisplay);
                    domStyle.set(this._mobileSearchNode, "display", "none");
                    domClass.replace(this._mobileGeocoderIconContainerNode, this.css.toggleBlue, this.css.toggleBlueOn);
                }
            },
            _setTitle: function (title) {
                // set config title
                this.config.title = title;
                // window title
                window.document.title = title;
            },
            _setTitleBar: function () {
                // map title node
                var node = dom.byId('title');
                if (node) {
                    // set title
                    node.innerHTML = this.config.title;
                    // title attribute
                    domAttr.set(node, "title", this.config.title);
                }
            },
            _setDialogModalContent: function (content) {
                // set dialog modal content
                this.config.dialogModalContent = content;
            },
            // create geocoder widgets
            _createGeocoders: function () {
                var searchOptions = {
                    map: this.map,
                    geocoders: this.config.helperServices.geocode || [],
                    itemData: this.config.itemInfo.itemData
                };
                if (this.config.searchConfig) {
                    searchOptions.enableSearchingAll = this.config.searchConfig.enableSearchingAll;
                    searchOptions.activeSourceIndex = this.config.searchConfig.activeSourceIndex;
                    searchOptions.applicationConfiguredSources = this.config.searchConfig.sources || [];
                } else {
                    var configuredSearchLayers = (this.config.searchLayers instanceof Array) ? this.config.searchLayers : JSON.parse(this.config.searchLayers);
                    searchOptions.configuredSearchLayers = configuredSearchLayers;
                    searchOptions.geocoders = this.config.locationSearch ? this.config.helperServices.geocode : [];
                }
                var searchSources = new SearchSources(searchOptions);
                // get options
                var createdOptions = searchSources.createOptions();
                // desktop size geocoder
                this._geocoder = new Search(createdOptions, dom.byId("geocoderSearch"));
                this._geocoder.startup();
                // mobile sized geocoder
                this._mobileGeocoder = new Search(createdOptions, dom.byId("geocoderMobile"));
                this._mobileGeocoder.startup();
                // geocoder results
                on(this._mobileGeocoder, 'search-results', lang.hitch(this, function () {
                    this._hideMobileGeocoder();
                }));
                // keep geocoder values in sync
                this._geocoder.watch("value", lang.hitch(this, function () {
                    var value = arguments[2];
                    var current = this._mobileGeocoder.value;
                    if (current !== value) {
                        this._mobileGeocoder.set("value", value);
                    }
                }));
                // keep geocoder values in sync
                this._mobileGeocoder.watch("value", lang.hitch(this, function () {
                    var value = arguments[2];
                    var current = this._geocoder.value;
                    if (current !== value) {
                        this._geocoder.set("value", value);
                    }
                }));
                // geocoder nodes
                this._mobileGeocoderIconNode = dom.byId("mobileGeocoderIcon");
                this._mobileSearchNode = dom.byId("mobileSearch");
                this._mobileGeocoderIconContainerNode = dom.byId("mobileGeocoderIconContainer");
                // mobile geocoder toggle
                if (this._mobileGeocoderIconNode) {
                    on(this._mobileGeocoderIconNode, "click", lang.hitch(this, function () {
                        if (domStyle.get(this._mobileSearchNode, "display") === "none") {
                            this._showMobileGeocoder();
                        } else {
                            this._hideMobileGeocoder();
                        }
                    }));
                }
                var closeMobileGeocoderNode = dom.byId("btnCloseGeocoder");
                if (closeMobileGeocoderNode) {
                    // cancel mobile geocoder
                    on(closeMobileGeocoderNode, "click", lang.hitch(this, function () {
                        this._hideMobileGeocoder();
                    }));
                }
            },
            // hide map loading spinner
            _hideLoadingIndicator: function () {
                // add loaded class
                domClass.remove(document.body, this.css.appLoading);
            },
            //create a map based on the input web map id
            _createWebMap: function (itemInfo) {
                // popup dijit
                var customPopup = new Popup({}, domConstruct.create("div"));
                // add popup theme
                domClass.add(customPopup.domNode, "calcite");
                // set extent from URL Param
                if (this.config.extent) {
                    var e = this.config.extent.split(',');
                    if (e.length === 4) {
                        itemInfo.item.extent = [
                            [
                                parseFloat(e[0]),
                                parseFloat(e[1])
                            ],
                            [
                                parseFloat(e[2]),
                                parseFloat(e[3])
                            ]
                        ];
                    }
                }
                //can be defined for the popup like modifying the highlight symbol, margin etc.
                arcgisUtils.createMap(itemInfo, "mapDiv", {
                    mapOptions: {
                        infoWindow: customPopup
                        //Optionally define additional map config here for example you can
                        //turn the slider off, display info windows, disable wraparound 180, slider position and more.
                    },
                    editable: false,
                    layerMixins: this.config.layerMixins || [],
                    usePopupManager: true,
                    bingMapsKey: this.config.bingmapskey
                }).then(lang.hitch(this, function (response) {
                    //Once the map is created we get access to the response which provides important info
                    //such as the map, operational layers, popup info and more. This object will also contain
                    //any custom options you defined for the template. In this example that is the 'theme' property.
                    //Here' we'll use it to update the application to match the specified color theme.
                    this.map = response.map;
                    this.layers = arcgisUtils.getLayerList(response);
                    this.item = response.itemInfo.item;
                    this.bookmarks = response.itemInfo.itemData.bookmarks;
                    this.layerInfos = arcgisUtils.getLegendLayers(response);
                    // window title and config title
                    this._setTitle(this.config.title || response.itemInfo.item.title);
                    // title bar title
                    this._setTitleBar();
                    // dialog modal content
                    this._setDialogModalContent(this.config.dialogModalContent || response.itemInfo.item.licenseInfo);
                    // map loaded
                    if (this.map.loaded) {
                        this._init();
                    } else {
                        on.once(this.map, 'load', lang.hitch(this, function () {
                            this._init();
                        }));
                    }
                }), this.reportError);
            },
            _defineSidewalkClosureLayer: function () {
                require(["esri/layers/FeatureLayer", "esri/symbols/PictureMarkerSymbol"],
                    lang.hitch(this, function (FeatureLayer, PictureMarkerSymbol) {
                        var featureCollection = {
                            "layerDefinition": null,
                            "featureSet": {
                                "features": [],
                                "geometryType": "esriGeometryPolyline"
                            }
                        };
                        featureCollection.layerDefinition = {
                            "geometryType": "esriGeometryPolyline",
                            "objectIdField": "OBJECTID_1",
                            "drawingInfo": {
                                "renderer": {
                                    "type": "simple",
                                    "symbol": {
                                        "type": "esriSLS",
                                        "style": "esriSLSSolid",
                                        "color": [0, 25, 100, 0],
                                        "width": 2
                                    }
                                }
                            },
                            "fields": [{
                                "name": "OBJECTID_1",
                                "alias": "OBJECTID_1",
                                "type": "esriFieldTypeOID"
                            }, {
                                "name": "OBJECTID",
                                "alias": "OBJECTID",
                                "type": "esriFieldTypeDouble"
                            },
                                {
                                    "name": "Name",
                                    "alias": "Name",
                                    "type": "esriFieldTypeString"
                                }, {
                                    "name": "St_Date",
                                    "alias": "St_Date",
                                    "type": "esriFieldTypeDate"
                                }, {
                                    "name": "End_Date",
                                    "alias": "End Date",
                                    "type": "esriFieldTypeString"
                                },
                                {
                                    "name": "Reason_of_Closure",
                                    "alias": "Reason of Closure",
                                    "type": "esriFieldTypeString"
                                },]
                        };
                        //this._sidewalkClosureDefinition = featureCollection;
                        var selectedClosure = new FeatureLayer(featureCollection, {
                            id: 'sidewalk closure'
                        });
                        selectedClosure.outFields = ['Name', 'End_Date', 'Reason_of_Closure'];
                        //var selectionSymbol = new PictureMarkerSymbol("https://sampleserver6.arcgisonline.com/arcgis/rest/services/RedlandsEmergencyVehicles/FeatureServer/1/images/3540cfc7a09a7bd66f9b7b2114d24eee", 48, 48);
                        //selectedClosure.setSelectionSymbol(selectionSymbol);
                        this._selectedSidewalkClosure = selectedClosure;
                        this.map.addLayers([selectedClosure]);
                    }));

            }

        });
    });