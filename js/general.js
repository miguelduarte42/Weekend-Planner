$(document).ready(function() {
			
	initialize();
	
	window.search = new SAPO.Maps.Search(map, 'result');
	window.search.registerEvent('completed', this, completed);
	window.directions = new SAPO.Maps.Directions(map, "results");
	
	window.restaurants_req = 0;
	window.hotels_req = 0;
	window.culture_req = 0;
	window.tourism_req = 0;
	
	window.directions = new Array();
	window.colors = new Array('#1B35E0','#1BE022','#BA1AAF', '#555753');
	window.current_color = 0;
	
	window.directions_asked = 0;
	
	window.markers = new Array();
	
	window.markers_to_delete = new Array();
	
	$(".options").hide();
	$(".loading").hide();
	$("#options_button1").show();
	
	//Alterar a tab que está visível (passo1, passo2, etc)
	$('.button').click(function(event){
		$('#sortable').html('');
		
		if(event.target.id=='button2' || event.target.id=='button1'){
			limparDireccoes();
			removeAllMarkers();
			$('#button3').addClass('inactive');
		}
		
		//Ultimo passo - Roteiro
		if(event.target.id=='button3'){
			if(checkEmpty(window.markers))
				return;
				
			accoesRoteiro();			
		}
	
		$('[id^="button"]').hide;
		$(".button").removeClass("active");
		$("#"+event.target.id).addClass('active');
		$('.options').css('display','none');
		$('[id^="options_'+event.target.id+'"]').fadeIn();
		$(this).removeClass('inactive');	
	});
	
	//Activar e desactivar layers de POIs, bem como
	//fechar ou abrir o Accordion
	$(".categorias").click(function(){
		fecharOuAbrirAba($(this));
	});
	
	initRaphaelDistritos();
	
	//Evitar que apareça um popup quando se pesquisa uma localidade
	function completed(search){
		window.search.unselectResult(window.search.getSelectedIndex());
	}
	
	function completedDirectionsSearch(search){
		
	}

	//Accordion
	$("#categorias").find("dd").hide();
	$("#categorias").find("dt").toggle(function() {
		$(this).next().slideDown("slow");				
	}, function() {
		$(this).next().slideUp("slow");
	});
	
	//Dar um uso à tecla Enter no formulário de pesquisa
	$("#localidade_field").keyup(function(event){
		if(event.keyCode == 13){
			 $("#localidade_button").click();
		 }
	});
	
	//Opções do sortable do roteiro
	$("#sortable").sortable({axis: 'y', dropOnEmpty: false, containment: '#options_bg', opacity: 0.75});
	$("#sortable").disableSelection();
	
	//Informações
	$("#informacoes").click(function(event){
		$("#popupWrapper").fadeToggle("slow");
		event.stopPropagation();
		return false;
	});
				
	$("#popupContactClose").click(function(){
		$("#popupWrapper").fadeToggle("slow");
	});
	
	//Tooltip quando o passo 3 está inactivo
	$("#button3").tipsy({gravity: 's',fade: true,fallback: "Escolhe alguns pontos de interesse antes de avançares!",trigger:'manual'});
	
});

function pesquisaLocalidade(source){
	pesquisarLocalidadeMapa($("#localidade_field").val());
}

function pesquisarLocalidadeMapa(localidade){
	window.localidade_seleccionada = localidade;
	window.search.cancel();
	window.search.clear();
	window.search.search(localidade, {resultsPerPage: 1});
}

//Chamado quando os pontos de interesse são recebidos pela API do Sapo Mapas
function markersActualizados(){

	var restaurants = SapoMapsApp.Layers['restaurants']['markers'];
	var hotels = SapoMapsApp.Layers['hotels']['markers'];
	var tourism = SapoMapsApp.Layers['tourism']['markers'];
	var culture = SapoMapsApp.Layers['culture']['markers'];
	
	if(restaurants != null){
		restaurants = restaurants.getMarkers();
		actualizarLabel('restaurants',restaurants.length);

		for(var i = 0 ; i < restaurants.length ; i++){
			var poid = restaurants[i].POIId;
			informacaoPOI(poid,'restaurants');
		}
	}
	
	if(hotels != null){
		hotels = hotels.getMarkers();
		actualizarLabel('hotels',hotels.length);
		
		for(var i = 0 ; i < hotels.length ; i++){
			var poid = hotels[i].POIId;
			informacaoPOI(poid,'hotels');
		}
	}
		
	if(tourism != null){
		tourism = tourism.getMarkers();
		actualizarLabel('tourism',tourism.length);
		
		for(var i = 0 ; i < tourism.length ; i++){
			var poid = tourism[i].POIId;
			informacaoPOI(poid,'tourism');
		}
	}
		
	if(culture != null){
		culture = culture.getMarkers();
		actualizarLabel('culture',culture.length);
		
		for(var i = 0 ; i < culture.length ; i++){
			var poid = culture[i].POIId;
			informacaoPOI(poid,'culture');
		}
	}
}

function removeAllMarkers(){
	for(var poid in window.markers)
		if(poid != null)
			removeMarker(poid);
	
	window.markers = new Array();
}

function removeMarker(poid){
	marker = window.markers[poid];
	if(marker){
		delete window.markers[poid];
		map.removeOverlay(marker);
	}
}

function poidSelected(source){
	var poi = $(source).parent().data('poi');

	if($(source).attr('checked')){ 
		marker = new SAPO.Maps.Marker(new OpenLayers.LonLat(poi.Longitude, poi.Latitude),{draggable: false},{markerImage:'images/default_marker.png'});
		window.markers[poi.POIId] = marker;
		map.addOverlay(marker);
	}else{
		removeMarker(poi.POIId);
		if(window.markers_to_delete[poi.POIId] == poi.POIId){
			apagarPOI(poi.POIId);
		}
	}
	
	if(checkEmpty(window.markers)){
		$("#button3").addClass('inactive');
	}else{
		$("#button3").removeClass('inactive');		
	}
}

function informacaoPOI(poid, category){

	if($("#"+poid).length == 0){
		changeReqCounter(category,1);
		SapoMapsApp.getPOI(poid, SAPO.Maps.Request.prototype.getRequester(), {
			timeout: 4,
			onComplete: function (obj) {
				var id = obj.GetPOIByIdResponse.GetPOIByIdResult.POIId;
				var name = obj.GetPOIByIdResponse.GetPOIByIdResult.Name;
				
				var checkbox = '<input type="checkbox" id="check_'+id+'" value="'+id+'" class="poid_checkbox" onChange="poidSelected(this)"/>';
				
				$("#"+category+"_list ul").append('<li class="poi_li" title="'+name+'"id="'+id+'">'+checkbox+name+'</li>');
				$("#"+id).data('poi',obj.GetPOIByIdResponse.GetPOIByIdResult);
				
				$('#'+id).mouseenter(function() {
					changeMarkerIcon(poid,false);
				});
				$('#'+id).mouseleave(function() {
					changeMarkerIcon(poid,true);
				});
				
				changeReqCounter(category,-1);
			},
			onTimeout: function(){
				informacaoPOI(poid,category);
				changeReqCounter(category,-1);
			}
		});
	}else{
		delete markers_to_delete[poid];
	}
}

function changeReqCounter(category, value){
	if(category=="restaurants") window.restaurants_req+=value;
	else if(category=="hotels") window.hotels_req+=value;
	else if(category=="culture") window.culture_req+=value;
	else if(category=="tourism") window.tourism_req+=value;
	
	if(window.restaurants_req > 0) $("#loading_restaurants").show(); else $("#loading_restaurants").hide();
	if(window.hotels_req > 0) $("#loading_hotels").show(); else $("#loading_hotels").hide();
	if(window.culture_req > 0) $("#loading_culture").show(); else $("#loading_culture").hide();
	if(window.tourism_req > 0) $("#loading_tourism").show(); else $("#loading_tourism").hide();
}

function apagarPOI(poid){
	if(!window.markers[poid])
		$("#"+poid).remove();
	else{
		markers_to_delete[poid] = poid;
	}
}

function actualizarLabel(nome, numero){
	
	var texto = obterLabel(nome);
	
	if(numero > 0)
		texto+=" ("+numero+")";
	
	$("#label_"+nome).text(texto);
}

function obterLabel(nome){
	if(nome=='culture') return "Cultura";
	if(nome=='tourism') return "Turismo";
	if(nome=='hotels') return "Hotéis";
	if(nome=='restaurants') return "Restaurantes";
}

function obterDireccoes(){

	limparDireccoes();
	window.directions_asked = 0;
	
	var prev;
	
	window.min_lat = 10000,
	window.max_lat = -10000,
	window.min_long = 10000,
	window.max_long = -10000;
	
	$("#sortable li").each(function(index){
		var poi = $(this).data('poid');
		
		if(poi.Latitude > window.max_lat) window.max_lat = poi.Latitude;
		if(poi.Latitude < window.min_lat) window.min_lat = poi.Latitude;
		if(poi.Longitude > window.max_long) window.max_long = poi.Longitude;
		if(poi.Longitude < window.min_long) window.min_long = poi.Longitude;
		
		if(!prev){
			prev = poi;
		}else{
			window.directions_asked++;
			getDirections(prev,poi);
		}
	});
}

function limparDireccoes(){
	for(var i = 0 ; i < window.directions.length ; i++)
		window.directions[i].clear();
	
	window.directions = new Array();
}

function fecharOuAbrirAba(aba){

	var value = aba.attr("id");
	value = value.substring(3); //remover "id_"
	
	if(aba.hasClass("closed")){
		 aba.removeClass("closed");
		 SapoMapsApp.POIS.activateLayer(value);
		 $("#loading_"+value).show();
	}else{
		aba.addClass("closed");
		
		SapoMapsApp.POIS.deactivateLayer(value);
		$("#"+value+"_list li").delay(500).queue(function() {
			if(!$('#button3').hasClass('active'))
				removeMarker($(this).attr('id'));
			$(this).remove();
		});
		$("#loading_"+value).hide();
		actualizarLabel(value,0);
	}
}

function accoesRoteiro(){

	//Obter todos os POIs que foram seleccionados
	$(".poid_checkbox:checked").each(function(index){
		var poi = $(this).parent().data('poi');
		if(poi){
			$('#sortable').append('<li id="sortable_'+poi.POIId+'"><img src="images/sort.gif" class="li_arrows"/><span class="text">'+poi.Name+'</span></li>');
			$("#sortable_"+poi.POIId).data("poid",poi);
			
			$("#sortable_"+poi.POIId).mouseenter(function() {
				changeMarkerIcon(poi.POIId,false);
		    });
		    $("#sortable_"+poi.POIId).mouseleave(function() {
		    	changeMarkerIcon(poi.POIId,true);
		    });
		}
	});
	
	//Fechar as tabs
	$(".categorias").each(function(){		
		if(!$(this).hasClass("closed")){
			$(this).click();
		}
	});	
}

function getDirections(from, to){
	
	var sd = new SAPO.Maps.Directions(map, "results");
	
	sd.registerEvent("completed", this, function(directions){
		var color = window.colors[window.current_color];
		window.current_color++;
		window.current_color = window.current_color % window.colors.length;
		
	    directions.getPolyline().setStyle({strokeColor:color})
	    window.directions.push(directions);
	    window.directions_asked--;
	    
	    if(window.directions_asked <= 0){
	    	map.setBounds(OpenLayers.Bounds(window.min_long-1, window.min_lat-1, window.max_long+2, window.max_lat+2));
	    }
	    
	});
	
	sd.getDirections(new OpenLayers.LonLat(from.Longitude, from.Latitude), new OpenLayers.LonLat(to.Longitude, to.Latitude));
}

function checkEmpty(obj){
	for(var prop in obj)
    	if (obj.hasOwnProperty(prop)){
        	return false;
        }
        	
	return true;
}

function changeMarkerIcon(poid,default_image) {
	var m = window.markers[poid];
	
	if(m){
		var image = 'images/default_marker.png';
		if(!default_image) image = 'images/hover_marker.png'
	
		m.setStyle({markerImage:image});
	}
}