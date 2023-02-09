function regexMatch(pattern, str) {
    let regex = new RegExp(pattern);
    return regex.test(str);
  }
