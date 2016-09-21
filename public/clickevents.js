document.documentElement.addEventListener('dblclick', function(event){
  addTextool(event);
  console.log(event);
})

function addTextool(event){
  var aTexTool = new TexTool(event.clientX, event.clientY);
  document.body.appendChild(aTexTool.element);
}



function TexTool(xPos, yPos){

  this.element = document.createElement('div');
  this.element.style.left = xPos + 'px';
  this.element.style.top = yPos + 'px';
  console.log(this);
}

new TexTool(50, 100)