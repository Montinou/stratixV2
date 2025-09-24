      if (!error && data) {
        setInitiatives(data);
      }
    };

    fetchInitiatives();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission with API
    console.log("Submit activity form");
  };

  return (
    <div>
      <p>Activity form is being migrated to the new API system.</p>
    </div>
  );
}