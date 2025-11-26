document.getElementById("closeBtn").addEventListener("click", function() {
            if (confirm("정말로 창을 닫으시겠습니까?")) {
                window.close();
            }
        });