function submitForm(event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    // Hash the password here using a JavaScript library such as bcrypt
    // or send a request to the server to hash the password and check against the database
    const errorMessage = document.getElementById("errorMessage");
    if (username === "test" && password === "test") {
      // Redirect the user to the homepage
      window.location.href = "homepage.html";
    } else {
      errorMessage.innerText = "Incorrect username or password";
      errorMessage.classList.add('show');
    }

    // let errormessage = document.querySelector('.error-message');

    // // ...
    // if (loginSuccessful) {
    //   // redirect to homepage
    // } else {
    // }

  }

  function highlightField(field) {
    field.style.borderColor = "#3f51b5";
  }

  function removeHighlight(field) {
    field.style.borderColor = "#ddd";
  }

  function pressButton(button) {
    button.style.transform = "translateY(2px)";
  }

  function releaseButton(button) {
    button.style.transform = "translateY(0)";
  }
